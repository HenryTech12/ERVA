import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { entitiesApi } from '@/api/entities'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { EvidenceTag } from '@/components/ui/EvidenceTag'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

export function Inspector({ node, onClose }) {
  const navigate = useNavigate()
  const { data: risk, isLoading } = useQuery({
    queryKey: ['entity-risk', node?.id],
    queryFn: () => entitiesApi.getRisk(node.id),
    enabled: !!node?.id,
    staleTime: 15_000,
  })

  if (!node) return null

  const riskScore = parseFloat(risk?.risk_score ?? risk?.riskScore ?? 0)
  const reason = risk?.reason
  const contributingAlerts = risk?.contributing_alert_ids ?? risk?.contributingAlertIds ?? []

  return (
    <aside className="fixed inset-y-0 right-0 z-30 w-full max-w-80 lg:static lg:z-auto lg:w-80 lg:max-w-none shrink-0 bg-[#131B2E] border-l border-[#26314D] overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#26314D] sticky top-0 bg-[#131B2E] z-10">
        <p className="text-xs text-[#8891A8] uppercase tracking-wider font-medium">Inspector</p>
        <button
          onClick={onClose}
          aria-label="Close inspector"
          className="p-1 rounded text-[#8891A8] hover:text-[#E8EAF0] hover:bg-[#1B2540] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4FA0A0]/50"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {node._simHighlight && (
          <div className="p-3 rounded-lg bg-gradient-to-br from-[#BE185D]/20 to-[#F97316]/10 border border-[#BE185D]/40">
            <div className="flex items-center gap-2">
              <span className="text-[#F97316] text-sm animate-pulse">⚡</span>
              <p className="text-xs font-semibold text-[#F97316]">Live Transaction Detected</p>
            </div>
          </div>
        )}

        <div>
          <p className="text-base font-semibold text-[#E8EAF0] font-display">{node.label}</p>
          <p className="text-xs text-[#8891A8] font-mono mt-0.5 break-all">{node.id}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge>{node.type}</Badge>
          <RiskBadge level={node.risk} />
        </div>

        <div className="pt-3 border-t border-[#26314D]">
          <p className="text-[10px] text-[#8891A8] uppercase tracking-wider mb-2">Trust Score</p>
          {isLoading ? (
            <Spinner size="sm" />
          ) : (
            <>
              <p className="text-2xl font-bold font-mono text-[#E8A33D]">
                {(riskScore * 100).toFixed(1)}%
              </p>
              {reason && (
                <p className="text-xs text-[#8891A8] mt-2 leading-relaxed">{reason}</p>
              )}
            </>
          )}
        </div>

        {contributingAlerts.length > 0 && (
          <div className="pt-3 border-t border-[#26314D]">
            <p className="text-[10px] text-[#8891A8] uppercase tracking-wider mb-2">Evidence</p>
            <div className="flex flex-wrap gap-1.5">
              {contributingAlerts.map((alertId) => (
                <EvidenceTag
                  key={alertId}
                  variant="risk"
                  label={String(alertId).slice(0, 8)}
                  className="cursor-pointer"
                />
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-[#26314D]">
          <Button variant="primary" size="sm" className="w-full" onClick={() => navigate(`/entities/${node.id}`)}>
            View Full Entity Profile →
          </Button>
        </div>
      </div>
    </aside>
  )
}
