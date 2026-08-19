import { cn } from '@/utils/cn'
import { forwardRef } from 'react'

const variants = {
  primary:   'bg-[#4FA0A0] text-[#0B1220] font-semibold hover:bg-[#4FA0A0]/90',
  secondary: 'bg-[#1B2540] border border-[#26314D] text-[#E8EAF0] hover:bg-[#131B2E]',
  outline:   'bg-transparent border border-[#26314D] text-[#E8EAF0] hover:bg-[#1B2540]',
  danger:    'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20',
  ghost:     'text-[#8891A8] hover:text-[#E8EAF0] hover:bg-[#1B2540]',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded',
  md: 'px-4 py-2 text-sm rounded-md',
  lg: 'px-6 py-3 text-base rounded-lg',
}

export const Button = forwardRef(({ className, variant = 'secondary', size = 'md', loading, children, disabled, ...props }, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={cn(
      'inline-flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      variants[variant], sizes[size], className
    )}
    {...props}
  >
    {loading && (
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    )}
    {children}
  </button>
))

Button.displayName = 'Button'
