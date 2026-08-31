import React, { useEffect, useRef } from 'react'
import { Popover } from '@headlessui/react'
import { Clock } from 'lucide-react'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

// premium replacement for the native <input type="time"> - same closed-field look as
// DatePicker.jsx (rounded-lg, border-hairline, a lucide icon), opening an hours/minutes column
// picker instead of the browser's own native time widget. `value`/`onChange` behave like a native
// time input's ('HH:MM' 24h strings), snapped to 5-minute steps to keep the minutes column short.
const TimePicker = ({ value, onChange, className = '' }) => {
  const [hh, mm] = (value || '00:00').split(':')

  return (
    <Popover className={`relative ${className}`}>
      <Popover.Button className='plain w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-bg-elevated border border-hairline text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent transition-shadow'>
        <Clock size={16} className='text-muted flex-shrink-0' />
        <span className='text-ink'>{value || '—'}</span>
      </Popover.Button>
      <Popover.Panel transition
        className='absolute z-20 mt-2 rounded-xl bg-bg-elevated border border-hairline shadow-xl p-2 flex gap-1 transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'>
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
          className={`plain w-full text-center py-1.5 text-sm rounded-md ${v === selected ? 'bg-accent-soft text-accent font-medium' : 'text-ink hover:bg-bg'}`}>
          {v}
        </button>
      ))}
    </div>
  )
}

export default TimePicker
