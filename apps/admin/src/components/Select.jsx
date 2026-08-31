import React, { useState } from 'react'
import { Listbox } from '@headlessui/react'
import { ChevronDown, Search } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'

// premium replacement for the native <select>, used everywhere across the app - the closed field
// is a calm, neutral rounded-lg/border-slate-200 control with a lucide chevron instead of the
// browser's own arrow; the open menu detaches with its own shadow/animation. Deliberately uses the
// soft accent-soft/accent pastel pair for the selected row rather than a saturated solid fill - a
// loud accent repeated across dozens of selects on one page (source filters, lead cards, group
// pickers, ...) is what actually reads as "acidic"; a muted pastel highlight stays calm at any scale.
// `options` is [{ value, label }]; `value`/`onChange` behave like a native select's.

// a filter box only shows up once there are enough options that scanning/scrolling stops being
// convenient (group pickers, course lists, student rosters can run into dozens of rows) - small
// selects (payment method, yes/no-ish pickers) stay exactly as simple as before, no added clutter
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
        <Listbox.Button onClick={() => setQuery('')} className='plain w-full h-10 flex items-center justify-between gap-2 px-3.5 rounded-xl bg-white border border-slate-200 dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:border-none text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-shadow disabled:opacity-50 disabled:cursor-not-allowed'>
          <span className={`truncate ${selected ? 'text-slate-900 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>{selected ? selected.label : (placeholder || '')}</span>
          <ChevronDown size={15} strokeWidth={1.5} className='text-slate-400 dark:text-slate-500 flex-shrink-0' />
        </Listbox.Button>
        <Listbox.Options transition
          className='absolute z-20 mt-1.5 w-full max-h-72 overflow-auto rounded-xl bg-white border border-slate-100 shadow-lg shadow-slate-200/50 dark:bg-[#161F30] dark:border-slate-800/80 dark:shadow-black/40 py-1 focus:outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'>
          {showSearch && (
            <div className='sticky -top-1 px-2 pt-1 pb-1.5 mb-1 bg-white dark:bg-[#161F30] border-b border-slate-100 dark:border-slate-800/80'>
              <div className='relative'>
                <Search size={13} strokeWidth={1.75} className='absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500' />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                  placeholder={t('selectSearchPlaceholder')}
                  className='w-full h-8 pl-7 pr-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border-none text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-accent/40'
                />
              </div>
            </div>
          )}
          {filteredOptions.map(o => (
            <Listbox.Option key={o.value} value={o.value} className={({ active, selected }) =>
              `px-3.5 py-2 text-sm cursor-pointer ${selected ? 'bg-accent-soft text-accent dark:bg-[#1E1B4B] dark:text-[#818CF8] font-medium' : active ? 'bg-slate-50 text-slate-900 dark:bg-slate-800/60 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`
            }>
              {o.label}
            </Listbox.Option>
          ))}
          {showSearch && filteredOptions.length === 0 && (
            <p className='px-3.5 py-3 text-xs text-slate-400 dark:text-slate-600 text-center'>{t('noOptionsFound')}</p>
          )}
        </Listbox.Options>
      </div>
    </Listbox>
  )
}

export default Select
