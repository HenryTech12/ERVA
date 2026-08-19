import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { IngestLiveTrigger } from '@/components/ingest/IngestLiveTrigger'
import { IngestMetrics } from '@/components/ingest/IngestMetrics'
import { IngestFlowChart } from '@/components/ingest/IngestFlowChart'
import { IngestActivityLog } from '@/components/ingest/IngestActivityLog'
import { IngestTransactionDrawer } from '@/components/ingest/IngestTransactionDrawer'
import { IngestFilingsPanel } from '@/components/ingest/IngestFilingsPanel'
import { IngestWebhookLog } from '@/components/ingest/IngestWebhookLog'
import { useIngestTransactions, useIngestMetrics, useIngestFilings } from '@/hooks/useIngest'
import { ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { formatDateTime } from '@/utils/formatters'
import { cn } from '@/utils/cn'

function exportCsv(transactions) {
  const headers = ['id', 'date', 'from_entity', 'from_name', 'to_entity', 'to_name', 'amount', 'currency', 'channel', 'risk_score', 'reference']
  const rows = transactions.map((t) =>
    [t.id, t.date, t.fromEntity, t.fromEntityName ?? '', t.toEntity, t.toEntityName ?? '',
      t.amount, t.currency, t.channel, t.riskScore, t.reference ?? '']
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ingest-transactions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const TABS = ['Activity', 'Webhooks', 'Filings']

export default function IngestMonitor() {
  const queryClient = useQueryClient()
  const [selectedTxn, setSelectedTxn] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('Activity')

  const { data: transactions = [], isLoading: txLoading, dataUpdatedAt } = useIngestTransactions(100)
  const { data: filings, isLoading: filingsLoading } = useIngestFilings()
  const metrics = useIngestMetrics(transactions)

  const handleRefresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['stripe'] })
    setTimeout(() => setRefreshing(false), 600)
  }

  const lastUpdated = dataUpdatedAt
    ? `Updated ${formatDateTime(new Date(dataUpdatedAt).toISOString())}`
    : null

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-[#F7F9FC]">Ingest Monitor</h1>
              {/* Live indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full brand-gradient-bg glow-brand">
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wide">Live</span>
              </div>
            </div>
            <p className="text-sm text-[#4B5563]">
              Real-time payment flow · transaction visibility · filing activity
            </p>
            {lastUpdated && (
              <p className="text-[10px] text-[#4B5563] font-mono mt-0.5 hidden lg:block">{lastUpdated}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#161B27] border border-[#1E2535] text-[#94A3B8] hover:text-[#F7F9FC] hover:border-[#FF4C1D]/30 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
              Refresh
            </button>
            <button
              onClick={() => exportCsv(transactions)}
              disabled={transactions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md brand-gradient-bg text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Brand gradient divider */}
      <div className="h-px w-full brand-gradient-bg mb-6 rounded-full opacity-40" />

      {/* Live fraud ring demo */}
      <div className="mb-8">
        <IngestLiveTrigger />
      </div>

      <div className="mb-6">
        <IngestMetrics metrics={metrics} isLoading={txLoading} />
      </div>

      <div className="mb-6">
        <IngestFlowChart transactions={transactions} isLoading={txLoading} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-[#0D1117] border border-[#1E2535] rounded-lg p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-1.5 rounded-md text-xs font-medium transition-all',
              activeTab === tab
                ? 'brand-gradient-bg text-white shadow-sm'
                : 'text-[#4B5563] hover:text-[#94A3B8]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Activity' && (
        <IngestActivityLog
          transactions={transactions}
          isLoading={txLoading}
          onRowClick={setSelectedTxn}
        />
      )}
      {activeTab === 'Webhooks' && <IngestWebhookLog />}
      {activeTab === 'Filings' && (
        <IngestFilingsPanel filings={filings} isLoading={filingsLoading} />
      )}

      <IngestTransactionDrawer
        transaction={selectedTxn}
        onClose={() => setSelectedTxn(null)}
      />
    </div>
  )
}
