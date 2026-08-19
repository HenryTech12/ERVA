import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'

export function PageHeader({ title, subtitle, backTo, actions, className }) {
  const navigate = useNavigate()
  return (
    <div className={cn('flex items-start justify-between mb-6', className)}>
      <div className="flex items-start gap-3">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="mt-0.5 p-1.5 rounded-md text-[#8891A8] hover:text-[#E8EAF0] hover:bg-[#1B2540] transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-semibold text-[#E8EAF0]">{title}</h1>
          {subtitle && <p className="text-sm text-[#8891A8] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
