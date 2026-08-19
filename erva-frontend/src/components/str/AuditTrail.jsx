import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/api/audit'
import { normaliseAuditEntry } from '@/hooks/useAudit'
import { formatDateTime } from '@/utils/formatters'
import { Spinner } from '@/components/ui/Spinner'

const ACTION_COLORS = {
  STR_GENERATED:        { dot: 'bg-[#4FA0A0]', label: 'text-[#4FA0A0]' },
  STR_DECISION_UPDATED: { dot: 'bg-blue-400',  label: 'text-blue-400'  },
  STR_FILED:            { dot: 'bg-green-400', label: 'text-green-400' },
}

function useSTRAuditEntries(strId) {
  return useQuery({
    queryKey: ['audit', 'str', strId],
    queryFn: async () => {
      const data = await auditApi.getAll(100)
      const items = data.items ?? data.entries ?? data
      const all = Array.isArray(items) ? items.map(normaliseAuditEntry) : []
      return all.filter((e) => e.target === strId || e.metadata?.str_id === strId)
    },
    enabled: !!strId,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function AuditTrail({ strId }) {
  const { data: entries, isLoading } = useSTRAuditEntries(strId)

  return (
    <div className="bg-[#131B2E] border border-[#26314D] rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-[#1B2540] border-b border-[#26314D] flex items-center justify-between">
        <span className="text-xs text-[#8891A8] uppercase tracking-wider">Audit Trail</span>
        {!isLoading && (
          <span className="text-xs text-[#8891A8]">{entries?.length ?? 0} events</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : !entries?.length ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-[#8891A8]">No audit events recorded yet</p>
        </div>
      ) : (
        <div className="px-4 py-4 relative">
          <div className="absolute left-[23px] top-4 bottom-4 w-px bg-[#26314D]" />
          <div className="space-y-4">
            {entries.map((ev) => {
              const colors = ACTION_COLORS[ev.action] ?? { dot: 'bg-[#8891A8]', label: 'text-[#8891A8]' }
              return (
                <div key={ev.id} className="flex gap-3 relative">
                  <div className={`w-3 h-3 rounded-full shrink-0 mt-0.5 ${colors.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-mono font-medium ${colors.label}`}>{ev.action}</p>
                    <p className="text-xs text-[#8891A8] mt-0.5">{ev.user}</p>
                    <p className="text-[10px] text-[#8891A8] font-mono mt-0.5">
                      {formatDateTime(ev.timestamp)}
                    </p>
                    {ev.hash && ev.hash !== '—' && (
                      <p className="text-[10px] text-[#26314D] font-mono truncate mt-0.5" title={ev.hash}>
                        {ev.hash}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
