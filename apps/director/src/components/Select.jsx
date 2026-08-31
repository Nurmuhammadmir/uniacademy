import React from 'react'
import { Listbox } from '@headlessui/react'

// premium replacement for the native <select> - the closed field matches the rest of the app's
// inputs (rounded-xl, border-hairline, focus ring in the runtime-switchable accent color from
// lib/theme.js) with a custom arrow instead of the browser's own, and the open menu is a detached
// popover with its own shadow/animation instead of the native unstyled dropdown.
// `options` is [{ value, label }]; `value`/`onChange` behave like a native select's.
const Select = ({ value, onChange, options, placeholder, className = '' }) => {
  const selected = options.find(o => o.value === value)

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className}`}>
        <Listbox.Button className='plain w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent transition-shadow'>
          <span className={`truncate ${selected ? 'text-ink' : 'text-muted'}`}>{selected ? selected.label : (placeholder || '')}</span>
          <svg width='16' height='16' viewBox='0 0 20 20' fill='none' className='text-muted flex-shrink-0'>
            <path d='M6 8l4 4 4-4' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </Listbox.Button>
        <Listbox.Options transition
          className='absolute z-20 mt-2 w-full max-h-60 overflow-auto rounded-xl bg-bg-elevated border border-hairline shadow-xl py-1.5 focus:outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'>
          {options.map(o => (
            <Listbox.Option key={o.value} value={o.value} className={({ active, selected }) =>
              `px-4 py-2 text-sm cursor-pointer ${selected ? 'bg-accent-soft text-accent font-medium' : active ? 'bg-bg text-ink' : 'text-ink'}`
            }>
              {o.label}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  )
}

export default Select
