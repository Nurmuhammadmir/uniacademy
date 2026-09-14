import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

const MONTHS: Record<string, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
}
// Monday-first, matching the grid below.
const WEEKDAYS: Record<string, string[]> = {
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  uz: ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'],
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const toIso = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`
const parseIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m: m - 1, d }
}
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
const mondayFirstDow = (y: number, m: number, d: number) => (new Date(y, m, d).getDay() + 6) % 7

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  max?: string
  min?: string
  placeholder?: string
  allowClear?: boolean
  className?: string
}

const DatePicker = ({ value, onChange, max, min, placeholder, allowClear, className }: DatePickerProps) => {
  const { lang, fmtDate, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const today = new Date()
  const initial = value ? parseIso(value) : { y: today.getFullYear(), m: today.getMonth() }
  const [viewYear, setViewYear] = useState(initial.y)
  const [viewMonth, setViewMonth] = useState(initial.m)
  const [alignRight, setAlignRight] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const ref = value ? parseIso(value) : { y: today.getFullYear(), m: today.getMonth() }
    setViewYear(ref.y)
    setViewMonth(ref.m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Keep the popover on-screen: flip to right/left or up/down instead of
  // letting it run off the edge of the viewport.
  useEffect(() => {
    if (!open) return
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const popoverWidth = 280
    const popoverHeight = 360
    setAlignRight(rect.left + popoverWidth > window.innerWidth - 8)
    setOpenUp(rect.bottom + popoverHeight > window.innerHeight - 8 && rect.top - popoverHeight > 8)
  }, [open])

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

  const goMonth = (delta: number) => {
    let m = viewMonth + delta, y = viewYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setViewMonth(m)
    setViewYear(y)
  }

  const isDisabled = (iso: string) => Boolean((max && iso > max) || (min && iso < min))

  const cells: { iso: string; day: number; inMonth: boolean }[] = []
  const leading = mondayFirstDow(viewYear, viewMonth, 1)
  const prevDays = daysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1, )
  for (let i = leading - 1; i >= 0; i--) {
    const pm = viewMonth === 0 ? 11 : viewMonth - 1
    const py = viewMonth === 0 ? viewYear - 1 : viewYear
    cells.push({ iso: toIso(py, pm, prevDays - i), day: prevDays - i, inMonth: false })
  }
  const total = daysInMonth(viewYear, viewMonth)
  for (let d = 1; d <= total; d++) cells.push({ iso: toIso(viewYear, viewMonth, d), day: d, inMonth: true })
  while (cells.length < 42) {
    const nm = viewMonth === 11 ? 0 : viewMonth + 1
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear
    const idx = cells.length - (leading + total)
    cells.push({ iso: toIso(ny, nm, idx + 1), day: idx + 1, inMonth: false })
  }

  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate())
  const monthLabel = `${MONTHS[lang][viewMonth]} ${viewYear}`
  const weekdayLabels = WEEKDAYS[lang]

  const displayLabel = value ? fmtDate(value, { month: 'short', day: 'numeric', year: 'numeric' }) : (placeholder || '')

  return (
    <div className={`relative ${className || ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-left bg-white
          focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all hover:border-gray-300"
      >
        <Calendar size={14} className="text-gray-400 flex-shrink-0" />
        <span className={value ? 'text-gray-900' : 'text-gray-300'}>{displayLabel || placeholder}</span>
      </button>

      {open && (
        <div className={`absolute z-50 w-[280px] bg-white rounded-2xl shadow-xl border border-gray-100 p-3 modal-card
          ${openUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${alignRight ? 'right-0' : 'left-0'}`}>
          <div className="flex items-center justify-between mb-2 px-1">
            <button type="button" onClick={() => goMonth(-1)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <div className="text-sm font-medium text-gray-900">{monthLabel}</div>
            <button type="button" onClick={() => goMonth(1)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {weekdayLabels.map(w => (
              <div key={w} className="text-center text-[10px] font-medium text-gray-400 py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map(cell => {
              const disabled = isDisabled(cell.iso)
              const selected = cell.iso === value
              const isToday = cell.iso === todayIso
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => { onChange(cell.iso); setOpen(false) }}
                  className={`aspect-square rounded-full text-xs flex items-center justify-center transition-colors
                    ${selected ? 'bg-[#0066CC] text-white font-semibold' :
                      disabled ? 'text-gray-200 cursor-not-allowed' :
                      !cell.inMonth ? 'text-gray-300 hover:bg-gray-50' :
                      isToday ? 'text-[#0066CC] font-semibold hover:bg-blue-50 ring-1 ring-[#0066CC]/30' :
                      'text-gray-700 hover:bg-gray-50'}`}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100">
            <button type="button" onClick={() => { onChange(todayIso); setOpen(false) }}
              className="text-xs font-medium text-[#0066CC] hover:underline">
              {t('datePicker.today')}
            </button>
            {allowClear && value && (
              <button type="button" onClick={() => { onChange(''); setOpen(false) }}
                className="text-xs text-gray-400 hover:text-gray-600">
                {t('operations.clearDates')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker
