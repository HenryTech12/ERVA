import { cn } from '@/utils/cn'

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse bg-[#1B2540] rounded', className)} />
}
