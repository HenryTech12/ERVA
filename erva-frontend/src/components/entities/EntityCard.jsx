import { Link } from 'react-router-dom'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { Badge } from '@/components/ui/Badge'

export function EntityCard({ entity }) {
  const isFrozen = entity.metadataJson?.frozen || entity.metadata_json?.frozen

  return (
    <Link
      to={`/entities/${entity.id}`}
      className={`group block rounded-lg p-4 transition-colors ${
        isFrozen
          ? 'bg-red-950/30 border border-red-500/40 hover:border-red-400/60'
          : 'bg-[#131B2E] border border-[#26314D] hover:border-[#4FA0A0]/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-medium text-[#E8EAF0] group-hover:text-[#4FA0A0] transition-colors">
              {entity.canonicalName}
            </p>
            {isFrozen && (
              <span className="text-[10px] font-bold text-red-400 bg-red-500/20 rounded px-1.5 py-0.5">FROZEN</span>
            )}
          </div>
          <p className="text-xs text-[#8891A8] font-mono mt-0.5">{entity.id}</p>
          {entity.bvn && <p className="text-xs text-[#8891A8] font-mono">BVN: {entity.bvn}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <RiskBadge level={entity.riskLevel} />
          <Badge>{entity.entityType}</Badge>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 bg-[#1B2540] rounded-full h-1">
          <div
            className="h-1 rounded-full"
            style={{
              width: `${entity.riskScore * 100}%`,
              backgroundColor: entity.riskLevel === 'HIGH' ? '#E8A33D' : entity.riskLevel === 'MEDIUM' ? '#E8A33D' : '#4FA0A0',
            }}
          />
        </div>
        <span className="text-[10px] text-[#8891A8] font-mono">{(entity.riskScore * 100).toFixed(0)}%</span>
      </div>
    </Link>
  )
}
