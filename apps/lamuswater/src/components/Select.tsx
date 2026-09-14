import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  icon?: ReactNode
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  triggerClassName?: string
  leadingIcon?: ReactNode
}

const Select = ({ value, onChange, options, placeholder, className, triggerClassName, leadingIcon }: SelectProps) => {
  const [open, setOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const popoverWidth = Math.max(rect.width, 180)
    const popoverHeight = Math.min(options.length * 38 + 16, 280)
    setAlignRight(rect.left + popoverWidth > window.innerWidth - 8)
    setOpenUp(rect.bottom + popoverHeight > window.innerHeight - 8 && rect.top - popoverHeight > 8)
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div className={`relative ${className || ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={triggerClassName || `w-full flex items-center justify-between gap-2 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-left bg-white
          focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all hover:border-gray-300`}
      >
        <span className={`truncate flex items-center gap-1.5 ${selected ? 'text-gray-900' : 'text-gray-300'}`}>
          {leadingIcon && <span className="text-gray-400 flex-shrink-0">{leadingIcon}</span>}
          {selected?.icon}
          {selected?.label || placeholder || ''}
        </span>
        <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute z-50 min-w-full w-max max-w-xs bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 modal-card
          ${openUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${alignRight ? 'right-0' : 'left-0'}`}>
          <div className="max-h-64 overflow-y-auto">
            {options.map(opt => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors
                    ${isSelected ? 'bg-blue-50 text-[#0066CC] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {opt.icon}
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isSelected && <Check size={14} className="flex-shrink-0" />}
                </button>
              )
            })}
            {options.length === 0 && <div className="px-3 py-2 text-sm text-gray-300">—</div>}
          </div>
        </div>
      )}
    </div>
  )
}

export default Select
