import React, { useState } from 'react'
import { Listbox } from '@headlessui/react'
import { ChevronDown, Search } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'

// `options` is [{ value, label }]; `value`/`onChange` behave like a native select's.
const SEARCH_THRESHOLD = 8

const Select = ({ value, onChange, options, placeholder, className = '', disabled = false, forceSearch = false }) => {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const selected = options.find(o => o.value === value)
  const showSearch = forceSearch || options.length > SEARCH_THRESHOLD
  const filteredOptions = showSearch && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={`relative ${className}`}>
        <Listbox.Button onClick={() => setQuery('')} className='plain w-full h-10 flex items-center justify-between gap-2 px-3.5 rounded-xl bg-white border border-slate-200 text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-shadow disabled:opacity-50 disabled:cursor-not-allowed'>
          <span className={`truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>{selected ? selected.label : (placeholder || '')}</span>
          <ChevronDown size={15} strokeWidth={1.5} className='text-slate-400 flex-shrink-0' />
        </Listbox.Button>
        <Listbox.Options transition
          className='absolute z-20 mt-1.5 w-full max-h-72 overflow-auto rounded-xl bg-white border border-slate-100 shadow-lg shadow-slate-200/50 py-1 focus:outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'>
          {showSearch && (
            <div className='sticky -top-1 px-2 pt-1 pb-1.5 mb-1 bg-white border-b border-slate-100'>
              <div className='relative'>
                <Search size={13} strokeWidth={1.75} className='absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400' />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                  placeholder={t('searchPlaceholder')}
                  className='w-full h-8 pl-7 pr-2 rounded-lg bg-slate-50 border-none text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-accent/40'
                />
              </div>
            </div>
          )}
          {filteredOptions.map(o => (
            <Listbox.Option key={o.value} value={o.value} className={({ active, selected }) =>
              `px-3.5 py-2 text-sm cursor-pointer ${selected ? 'bg-accent-soft text-accent font-medium' : active ? 'bg-slate-50 text-slate-900' : 'text-slate-700'}`
            }>
              {o.label}
            </Listbox.Option>
          ))}
          {showSearch && filteredOptions.length === 0 && (
            <p className='px-3.5 py-3 text-xs text-slate-400 text-center'>{t('notFoundOption')}</p>
          )}
        </Listbox.Options>
      </div>
    </Listbox>
  )
}

export default Select
