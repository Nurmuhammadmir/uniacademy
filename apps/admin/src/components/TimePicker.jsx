import React, { useEffect, useRef } from 'react'
import { Popover } from '@headlessui/react'
import { Clock } from 'lucide-react'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

// premium replacement for the native <input type="time"> - same closed-field look as
// DatePicker.jsx/Select.jsx (rounded-lg, border-slate-200, a lucide icon), opening an hours/minutes
// column picker instead of the browser's own native time widget. `value`/`onChange` behave like a
// native time input's ('HH:MM' 24h strings), snapped to 5-minute steps to keep the minutes column short.
const TimePicker = ({ value, onChange, className = '' }) => {
  const [hh, mm] = (value || '00:00').split(':')

  return (
    <Popover className={`relative ${className}`}>
      <Popover.Button className='plain w-full flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:border-none text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-shadow'>
        <Clock size={15} className='text-slate-400 dark:text-slate-500 flex-shrink-0' />
        <span className='text-slate-900 dark:text-slate-200'>{value || '—:—'}</span>
      </Popover.Button>
      <Popover.Panel transition
        className='absolute z-20 mt-1.5 rounded-lg bg-white border border-slate-100 shadow-md dark:bg-[#161F30] dark:border-slate-800/80 dark:shadow-black/40 p-2 flex gap-1 transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'>
        <TimeColumn values={HOURS} selected={hh} onSelect={(h) => onChange(`${h}:${mm}`)} />
        <TimeColumn values={MINUTES} selected={mm} onSelect={(m) => onChange(`${hh}:${m}`)} />
      </Popover.Panel>
    </Popover>
  )
}

const TimeColumn = ({ values, selected, onSelect }) => {
  const activeRef = useRef(null)
  useEffect(() => { activeRef.current?.scrollIntoView({ block: 'center' }) }, [])

  return (
    <div className='w-14 max-h-48 overflow-y-auto flex flex-col gap-0.5'>
      {values.map(v => (
        <button key={v} type='button' ref={v === selected ? activeRef : null} onClick={() => onSelect(v)}
          className={`plain w-full text-center py-1.5 text-sm rounded-md ${v === selected ? 'bg-blue-50 text-blue-700 dark:bg-[#1E1B4B] dark:text-[#818CF8] font-medium' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'}`}>
          {v}
        </button>
      ))}
    </div>
  )
}

export default TimePicker
