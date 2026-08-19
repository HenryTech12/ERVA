import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { formatNaira, formatDateTime } from '@/utils/formatters'
import { deriveRiskLevel } from '@/utils/risk'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { cn } from '@/utils/cn'

function Field({ label, value, mono = false, className }) {
  return (
    <div>
      <p className="text-[10px] text-[#8891A8] uppercase tracking-wider mb-0.5">{label}</p>
      <p className={cn('text-sm text-[#E8EAF0] break-all', mono && 'font-mono text-xs', className)}>
        {value ?? '—'}
      </p>
    </div>
  )
}

function FlowNode({ label, sub, highlight }) {
  return (
    <div className={cn(
      'flex-1 rounded-lg border p-3 text-center',
      highlight
        ? 'border-[#4FA0A0]/40 bg-[#4FA0A0]/5'
        : 'border-[#26314D] bg-[#1B2540]'
    )}>
      <p className="text-xs font-medium text-[#E8EAF0] truncate">{label}</p>
      {sub && <p className="text-[10px] text-[#8891A8] font-mono truncate mt-0.5">{sub}</p>}
    </div>
  )
}

export function IngestTransactionDrawer({ transaction, onClose }) {
  const navigate = useNavigate()

  return (
    <AnimatePresence>
      {transaction && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-[#131B2E] border-l border-[#26314D] z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#26314D] shrink-0">
              <div>
                <p className="text-sm font-semibold text-[#E8EAF0]">Transaction Detail</p>
                <p className="text-[10px] text-[#8891A8] font-mono mt-0.5 truncate max-w-[280px]">{transaction.id}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded text-[#8891A8] hover:text-[#E8EAF0] hover:bg-[#1B2540] transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Risk + amount hero */}
              <div className="flex items-center justify-between p-4 bg-[#1B2540] border border-[#26314D] rounded-lg">
                <div>
                  <p className="text-3xl font-bold font-mono text-[#4FA0A0]">
                    {formatNaira(transaction.amount)}
                  </p>
                  <p className="text-xs text-[#8891A8] mt-1">{transaction.currency ?? 'NGN'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <RiskBadge level={deriveRiskLevel(transaction.riskScore)} />
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border',
                    transaction.isStripe
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-[#1B2540] text-[#8891A8] border-[#26314D]'
                  )}>
                    {(transaction.channel ?? 'unknown').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Money flow path */}
              <div>
                <p className="text-[10px] text-[#8891A8] uppercase tracking-wider mb-2">Payment Flow</p>
                <div className="flex items-center gap-2">
                  <FlowNode
                    label={transaction.fromEntityName ?? 'Sender'}
                    sub={String(transaction.fromEntity).slice(0, 14) + '…'}
                  />
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-8 h-px bg-[#4FA0A0]" />
                    <span className="text-[#4FA0A0] text-xs mt-0.5">→</span>
                    <p className="text-[9px] text-[#8891A8] font-mono mt-0.5">{formatNaira(transaction.amount)}</p>
                  </div>
                  <FlowNode
                    label={transaction.toEntityName ?? 'Receiver'}
                    sub={String(transaction.toEntity).slice(0, 14) + '…'}
                    highlight
                  />
                </div>
              </div>

              {/* Core fields */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date & Time" value={formatDateTime(transaction.date)} />
                <Field label="Reference" value={transaction.reference} mono />
                <Field label="Risk Score" value={`${(transaction.riskScore * 100).toFixed(1)}%`} />
                <Field label="Channel" value={(transaction.channel ?? '—').toUpperCase()} />
              </div>

              {/* Entity links */}
              <div className="space-y-2">
                <p className="text-[10px] text-[#8891A8] uppercase tracking-wider">Entities</p>
                {[
                  { label: 'Sender', id: transaction.fromEntity, name: transaction.fromEntityName },
                  { label: 'Receiver', id: transaction.toEntity, name: transaction.toEntityName },
                ].map(({ label, id, name }) => (
                  <button
                    key={label}
                    onClick={() => { navigate(`/entities/${id}`); onClose() }}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-[#1B2540] hover:bg-[#26314D] border border-[#26314D] rounded-lg transition-colors text-left"
                  >
                    <div>
                      <p className="text-[10px] text-[#8891A8] uppercase">{label}</p>
                      <p className="text-sm text-[#E8EAF0] font-medium">{name ?? id}</p>
                      <p className="text-[10px] text-[#8891A8] font-mono">{String(id).slice(0, 20)}…</p>
                    </div>
                    <ArrowTopRightOnSquareIcon className="w-4 h-4 text-[#8891A8]" />
                  </button>
                ))}
              </div>

              {/* Metadata */}
              {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
                <div>
                  <p className="text-[10px] text-[#8891A8] uppercase tracking-wider mb-2">Metadata</p>
                  <div className="bg-[#0B1220] border border-[#26314D] rounded-lg p-3 overflow-x-auto">
                    <pre className="text-[10px] text-[#8891A8] font-mono whitespace-pre-wrap">
                      {JSON.stringify(transaction.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
