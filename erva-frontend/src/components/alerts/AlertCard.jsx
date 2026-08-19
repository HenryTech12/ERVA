import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EvidenceTag } from '@/components/ui/EvidenceTag'
import { PATTERN_LABELS, formatNairaShort } from '@/utils/formatters'

export function AlertCard({ alert }) {
  const detectedAt = new Date(alert.detectedAt)
  return (
    <Link
      to={`/alerts/${alert.id}`}
      className="group block bg-[#131B2E] border border-[#26314D] rounded-lg p-4 hover:border-[#4FA0A0]/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <RiskBadge level={alert.riskLevel} />
          <div>
            <p className="text-sm font-medium text-[#E8EAF0] group-hover:text-[#4FA0A0] transition-colors">
              {PATTERN_LABELS[alert.patternType] ?? alert.patternType}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <EvidenceTag label={alert.patternType} variant="neutral" />
              <EvidenceTag label={`RISK ${(alert.riskScore * 100).toFixed(0)}%`} variant="risk" />
              <EvidenceTag label={detectedAt.toLocaleTimeString('en-GB')} variant="neutral" />
            </div>
            <p className="text-xs text-[#8891A8] font-mono mt-1.5">
              {alert.entityCount} entities · {formatNairaShort(alert.totalVolume)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={alert.status} />
          <span className="text-[10px] text-[#8891A8]">
            {formatDistanceToNow(detectedAt, { addSuffix: true })}
          </span>
        </div>
      </div>
    </Link>
  )
}
