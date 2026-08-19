import { formatDateTime } from '@/utils/formatters'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'

const STATUS_EVENTS = {
  OPEN: { label: 'Alert Detected', color: '#E8A33D' },
  IN_REVIEW: { label: 'Under Investigation', color: '#3B82F6' },
  STR_FILED: { label: 'STR Filed with NFIU', color: '#4FA0A0' },
  DISMISSED: { label: 'Alert Dismissed', color: '#6B7280' },
}

export function AlertTimeline({ alert }) {
  const events = [
    { time: alert.detectedAt, status: 'OPEN', user: 'ERVA Engine' },
    ...(alert.status !== 'OPEN' ? [{ time: alert.detectedAt, status: alert.status, user: 'Akeem Jr.' }] : []),
  ]

  return (
    <div className="bg-[#131B2E] border border-[#26314D] rounded-lg p-4">
      <p className="text-xs text-[#8891A8] uppercase tracking-wider mb-4">Alert Timeline</p>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#26314D]" />
        <div className="space-y-4">
          {events.map((ev, i) => {
            const cfg = STATUS_EVENTS[ev.status]
            return (
              <div key={i} className="flex gap-4 relative">
                <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5 bg-[#0B1220]" style={{ borderColor: cfg.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[#E8EAF0]">{cfg.label}</span>
                    <StatusBadge status={ev.status} />
                  </div>
                  <p className="text-xs text-[#8891A8] mt-0.5">{ev.user}</p>
                  <p className="text-[10px] text-[#8891A8] font-mono mt-0.5">{formatDateTime(ev.time)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
