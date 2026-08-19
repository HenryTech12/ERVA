import { useState, useEffect } from 'react'

export function STREditor({ content, onChange, readOnly = false }) {
  const [value, setValue] = useState(content ?? '')

  // Sync when content prop changes (e.g. after data loads)
  useEffect(() => {
    setValue(content ?? '')
  }, [content])

  const handleChange = (e) => {
    setValue(e.target.value)
    onChange?.(e.target.value)
  }

  return (
    <div className="bg-[#131B2E] border border-[#26314D] rounded-lg overflow-hidden h-full flex flex-col">
      <div className="px-4 py-2 bg-[#1B2540] border-b border-[#26314D] flex items-center justify-between shrink-0">
        <span className="text-xs text-[#8891A8] uppercase tracking-wider">STR Draft</span>
        {readOnly
          ? <span className="text-[10px] text-[#8891A8]">Read-only</span>
          : <span className="text-[10px] text-[#4FA0A0]">Editable</span>
        }
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        readOnly={readOnly}
        rows={24}
        className="flex-1 w-full bg-transparent p-4 text-sm text-[#E8EAF0] font-mono resize-none focus:outline-none focus:bg-[#1B2540]/40 leading-relaxed"
        style={{ minHeight: '480px' }}
        placeholder={readOnly ? '' : 'STR content will appear here after generation…'}
      />
    </div>
  )
}
