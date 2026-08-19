import { EvidenceTag } from '@/components/ui/EvidenceTag'

const RISK_VARIANT = { HIGH: 'risk', MEDIUM: 'risk', LOW: 'trust', NONE: 'neutral' }

export function NodeTooltip({ node, x, y }) {
  if (!node) return null
  return (
    <div
      className="absolute pointer-events-none bg-[#1B2540] border border-[#26314D] rounded-lg p-3 text-xs z-10 shadow-xl min-w-36"
      style={{ left: x + 12, top: y - 10 }}
    >
      <p className="text-[#E8EAF0] font-medium mb-0.5">{node.label}</p>
      <p className="text-[#8891A8]">{node.type}</p>
      <div className="flex items-center gap-1.5 mt-1.5">
        <EvidenceTag label={node.risk} variant={RISK_VARIANT[node.risk] ?? 'neutral'} />
      </div>
      <p className="text-[#8891A8] font-mono mt-1">{node.id}</p>
    </div>
  )
}
