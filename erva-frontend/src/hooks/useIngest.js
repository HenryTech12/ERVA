import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '@/api/transactions'
import { strApi } from '@/api/str'
import { auditApi } from '@/api/audit'
import { normaliseAuditEntry } from '@/hooks/useAudit'

function normalise(t) {
  return {
    id: t.id,
    fromEntity: t.fromEntity ?? t.from_entity_id ?? '—',
    toEntity: t.toEntity ?? t.to_entity_id ?? '—',
    fromEntityName: t.from_entity_name ?? t.fromEntityName ?? null,
    toEntityName: t.to_entity_name ?? t.toEntityName ?? null,
    amount: parseFloat(t.amount ?? 0),
    currency: t.currency ?? 'NGN',
    channel: t.channel ?? '—',
    date: t.date ?? t.occurred_at ?? t.created_at,
    isStripe: (t.channel ?? '').toLowerCase() === 'stripe',
    riskScore: parseFloat(t.risk_score ?? t.riskScore ?? 0),
    reference: t.reference ?? null,
    metadata: t.metadata_json ?? {},
  }
}

export function useIngestTransactions(limit = 100) {
  return useQuery({
    queryKey: ['stripe', 'transactions', limit],
    queryFn: async () => {
      const data = await transactionsApi.getRecent(limit)
      return (Array.isArray(data) ? data : []).map(normalise)
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}

export function useIngestMetrics(transactions = []) {
  const stripeTxns = transactions.filter((t) => t.isStripe)
  const total = transactions.length
  const stripeCount = stripeTxns.length
  const stripeVolume = stripeTxns.reduce((s, t) => s + t.amount, 0)
  const totalVolume = transactions.reduce((s, t) => s + t.amount, 0)
  const highRisk = transactions.filter((t) => t.riskScore >= 0.7).length
  const channelBreakdown = transactions.reduce((acc, t) => {
    const ch = t.channel || 'unknown'
    acc[ch] = (acc[ch] ?? 0) + 1
    return acc
  }, {})
  return { total, stripeCount, stripeVolume, totalVolume, highRisk, channelBreakdown }
}

export function useIngestFilings() {
  return useQuery({
    queryKey: ['stripe', 'filings'],
    queryFn: async () => {
      const data = await strApi.getAll()
      const items = data.strs ?? data.items ?? []
      return items
        .filter((s) => s.content_json?.stripe_transaction_ref)
        .map((s) => ({
          id: s.id,
          alertId: s.alert_id,
          decision: s.decision,
          stripeRef: s.content_json.stripe_transaction_ref,
          createdAt: s.created_at,
          modelName: s.model_name,
        }))
    },
    staleTime: 30_000,
  })
}

export function useIngestWebhookEvents(limit = 200) {
  return useQuery({
    queryKey: ['stripe', 'webhooks', limit],
    queryFn: async () => {
      const data = await auditApi.getAll(limit, 'stripe_webhook_enqueued')
      const items = data.items ?? data.entries ?? data
      return Array.isArray(items) ? items.map(normaliseAuditEntry) : []
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
  })
}
