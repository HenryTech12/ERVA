import { useEffect } from 'react'
import { cn } from '@/utils/cn'
import { XMarkIcon } from '@heroicons/react/24/outline'

export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-[#1B2540] border border-[#26314D] rounded-lg w-full shadow-2xl', sizes[size])}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#26314D]">
          <h3 className="text-sm font-semibold text-[#E8EAF0]">{title}</h3>
          <button onClick={onClose} className="p-1 rounded text-[#8891A8] hover:text-[#E8EAF0] hover:bg-[#26314D] transition-colors">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
