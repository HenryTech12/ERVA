import { cn } from '@/utils/cn'

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('bg-[#131B2E] border border-[#26314D] rounded-lg', className)} {...props}>
      {children}
    </div>
  )
}
