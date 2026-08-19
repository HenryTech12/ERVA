import { cn } from '@/utils/cn'

export function Badge({ children, className }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-[#26314D] bg-[#1B2540] text-[#8891A8]', className)}>
      {children}
    </span>
  )
}
