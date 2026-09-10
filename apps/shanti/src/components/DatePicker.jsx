import React from 'react'
import { Popover } from '@headlessui/react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { ru, uz } from 'react-day-picker/locale'
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const LOCALES = { ru, uz }
const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const formatDMY = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`

const Chevron = ({ orientation, ...props }) => {
  const Icon = orientation === 'left' ? ChevronLeft : orientation === 'down' ? ChevronDown : ChevronRight
  return <Icon size={16} strokeWidth={1.5} {...props} />
}

const DatePicker = ({ value, onChange, className = '', withYearSelect = false, maxDate = null }) => {
  const { lang } = useLanguage()
  const selected = value ? new Date(value + 'T00:00:00') : undefined
  const formatted = selected ? formatDMY(selected) : ''
  const today = new Date()

  return (
    <Popover className={className}>
      <Popover.Button className='plain w-full h-10 flex items-center gap-2 px-3.5 rounded-xl bg-[#f5f5f7] border border-slate-200/60 text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-shadow'>
        <span className={`flex-1 truncate ${formatted ? 'text-slate-900' : 'text-slate-400'}`}>{formatted || '—'}</span>
        <Calendar size={15} strokeWidth={1.5} className='text-slate-400 flex-shrink-0' />
      </Popover.Button>
      <Popover.Panel anchor='bottom start' transition
        className='z-50 w-[280px] rounded-2xl bg-white border border-slate-100 shadow-xl p-4 transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:6px]'>
        {({ close }) => (
          <DayPicker mode='single' selected={selected} locale={LOCALES[lang] || ru} components={{ Chevron }}
            {...(withYearSelect ? { captionLayout: 'dropdown-years', startMonth: new Date(today.getFullYear() - 100, 0), endMonth: today } : {})}
            {...(maxDate ? { disabled: { after: new Date(maxDate + 'T00:00:00') } } : {})}
            onSelect={(d) => { onChange(d ? toISODate(d) : ''); close() }} />
        )}
      </Popover.Panel>
    </Popover>
  )
}

export default DatePicker
