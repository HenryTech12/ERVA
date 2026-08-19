import { cn } from '@/utils/cn'

// Signature recurring element across ERVA: a small monospace chip styled like a
// tag pinned to an investigation corkboard — a pattern type, risk score, or
// timestamp attached as evidence to a graph node, inspector panel, or alert row.
const VARIANTS = {
  risk:    'border-[#E8A33D]/40 bg-[#E8A33D]/10 text-[#E8A33D]',
  trust:   'border-[#4FA0A0]/40 bg-[#4FA0A0]/10 text-[#4FA0A0]',
  quantum: 'border-[#7C6FF0]/40 bg-[#7C6FF0]/10 text-[#7C6FF0]',
  neutral: 'border-[#26314D] bg-[#1B2540] text-[#8891A8]',
}

export function EvidenceTag({ label, variant = 'neutral', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border font-mono text-[10px]',
        'uppercase tracking-wide shadow-[0_1px_3px_rgba(0,0,0,0.4)]',
        'transition-transform duration-150 hover:-rotate-2 hover:-translate-y-px',
        VARIANTS[variant] ?? VARIANTS.neutral,
        className,
      )}
    >
      <span className="w-1 h-1 rounded-full bg-current opacity-60 shrink-0" />
      {label}
    </span>
  )
}
