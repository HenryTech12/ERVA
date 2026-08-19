import { cn } from '@/utils/cn'
import { forwardRef } from 'react'

export const Input = forwardRef(({ className, label, error, ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs text-[#8891A8] font-medium uppercase tracking-wider">{label}</label>}
    <input
      ref={ref}
      className={cn(
        'w-full bg-[#1B2540] border border-[#26314D] rounded-md px-3 py-2 text-sm text-[#E8EAF0] font-mono',
        'placeholder:text-[#8891A8] focus:outline-none focus:border-[#4FA0A0]/50 transition-colors',
        error && 'border-red-500/50',
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
))

Input.displayName = 'Input'
