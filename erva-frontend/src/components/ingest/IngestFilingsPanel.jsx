import { useNavigate } from 'react-router-dom'
import { formatDateTime } from '@/utils/formatters'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Spinner } from '@/components/ui/Spinner'
import { ArrowTopRightOnSquareIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export function IngestFilingsPanel({ filings, isLoading }) {
  const navigate = useNavigate()

  return (
    <div className="bg-[#131B2E] border border-[#26314D] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#26314D] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs text-[#8891A8] uppercase tracking-wider font-medium">Payment Processor STR Filings</p>
          <CheckCircleIcon className="w-3.5 h-3.5 text-[#4FA0A0]" />
        </div>
        <span className="text-xs text-[#8891A8]">{filings?.length ?? 0} filed</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : !filings?.length ? (
        <div className="py-10 text-center">
          <p className="text-sm text-[#8891A8]">No STRs filed via payment processor yet</p>
          <p className="text-xs text-[#8891A8] mt-1">Approved STRs will appear here once filed</p>
        </div>
      ) : (
        <div className="divide-y divide-[#26314D]">
          {filings.map((f) => (
            <button
              key={f.id}
              onClick={() => navigate(`/str/${f.id}`)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1B2540] transition-colors text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={f.decision?.toUpperCase()} />
                  <span className="text-[10px] text-[#8891A8] font-mono">{formatDateTime(f.createdAt)}</span>
                </div>
                <p className="text-xs text-[#8891A8] font-mono truncate">
                  Processor Ref: <span className="text-[#4FA0A0]">{f.stripeRef}</span>
                </p>
                <p className="text-[10px] text-[#8891A8] font-mono truncate mt-0.5">
                  Alert: {f.alertId}
                </p>
              </div>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 text-[#8891A8] shrink-0 ml-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
