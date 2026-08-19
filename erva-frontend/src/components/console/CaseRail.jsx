import { EvidenceTag } from '@/components/ui/EvidenceTag'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Spinner } from '@/components/ui/Spinner'
import { PATTERN_LABELS } from '@/utils/formatters'

const RISK_VARIANT = { HIGH: 'risk', MEDIUM: 'risk', LOW: 'trust', NONE: 'neutral' }

function CaseRow({ alert, isSelected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(alert)}
      className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-[#4FA0A0]/50 ${
        isSelected
          ? 'bg-[#1B2540] border-[#4FA0A0]/50'
          : 'bg-transparent border-transparent hover:bg-[#1B2540] hover:border-[#26314D]'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs font-medium text-[#E8EAF0] leading-tight">
          {PATTERN_LABELS[alert.patternType] ?? alert.patternType}
        </p>
        <StatusBadge status={alert.status} />
      </div>
      <div className="flex flex-wrap gap-1">
        <EvidenceTag label={alert.patternType} variant="neutral" />
        <EvidenceTag label={`RISK ${(alert.riskScore * 100).toFixed(0)}%`} variant={RISK_VARIANT[alert.riskLevel] ?? 'risk'} />
      </div>
    </button>
  )
}

export function CaseRail({ alerts, isLoading, selectedAlertId, onSelectAlert, entityCount, openCount }) {
  return (
    <aside className="w-72 shrink-0 bg-[#131B2E] border-r border-[#26314D] flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[#26314D]">
        <p className="text-xs text-[#8891A8] uppercase tracking-wider font-medium mb-2">Case Rail</p>
        <div className="flex items-center gap-3 text-[11px] font-mono text-[#8891A8]">
          <span>{entityCount ?? '…'} entities</span>
          <span className="text-[#26314D]">·</span>
          <span className={openCount > 0 ? 'text-[#E8A33D]' : ''}>{openCount} open</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : !alerts?.length ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-[#8891A8]">No open alerts — the pipeline is watching.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <CaseRow
              key={alert.id}
              alert={alert}
              isSelected={alert.id === selectedAlertId}
              onSelect={onSelectAlert}
            />
          ))
        )}
      </div>
    </aside>
  )
}
