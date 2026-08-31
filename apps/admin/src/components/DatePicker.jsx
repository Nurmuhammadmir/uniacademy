import React from 'react'
import { Popover } from '@headlessui/react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { enUS, ru, uz } from 'react-day-picker/locale'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'

// react-day-picker has no dedicated Karakalpak locale - falls back to Uzbek, same convention
// Timetable.jsx already uses for its own date formatting (`{..., kaa: 'uz'}[lang]`)
const LOCALES = { en: enUS, ru, uz, kaa: uz }
const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// plain DD.MM.YYYY instead of toLocaleDateString(...,{month:'short'}) - some locales this app
// supports (uz-UZ in particular) don't have short month names in every browser/Node's bundled ICU
// data, which silently fell back to a garbled "2026 M08 28" instead of a real month abbreviation.
// A fixed numeric format sidesteps that entirely and reads the same in every language.
const formatDMY = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`

// react-day-picker's own Chevron renders a plain SVG that reads as heavy/mismatched next to the
// rest of the app's lucide icon set - swap it for the real thing, still respecting whichever
// direction react-day-picker asks for (nav arrows pass 'left'/'right', multi-month views can also
// ask for 'up'/'down', not used here but handled for completeness)
const Chevron = ({ orientation, ...props }) => {
  const Icon = orientation === 'left' ? ChevronLeft : ChevronRight
  return <Icon size={16} strokeWidth={1.5} {...props} />
}

// premium replacement for the native <input type="date"> - the calendar itself stays fully hidden
// until the field is clicked (a compact popover, not an always-open block that pushes the rest of
// the filter bar around), and is deliberately sized down from react-day-picker's roomy desktop
// default (see the .rdp-root size overrides in index.css) - a date picker this style is meant to be
// glanced at for a second, not a full calendar app.
const DatePicker = ({ value, onChange, className = '' }) => {
  const { lang } = useLanguage()
  const selected = value ? new Date(value + 'T00:00:00') : undefined
  const formatted = selected ? formatDMY(selected) : ''

  return (
    <Popover className={className}>
      <Popover.Button className='plain w-full h-10 flex items-center gap-2 px-3.5 rounded-xl bg-[#f5f5f7] border border-slate-200/60 dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:border-none text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-shadow'>
        <span className={`flex-1 truncate ${formatted ? 'text-slate-900 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>{formatted || '—'}</span>
        <Calendar size={15} strokeWidth={1.5} className='text-slate-400 dark:text-slate-500 flex-shrink-0' />
      </Popover.Button>
      {/* `anchor` (Headless UI's Floating-UI-backed positioning, same mechanism already used by
          Select.jsx's Listbox and every row-actions Menu in this app) instead of a manually
          `absolute`-positioned panel. This is load-bearing, not cosmetic: a plain `absolute` panel
          is still laid out INSIDE its nearest scrolling/overflow ancestor, so dropped into a
          horizontally-scrolling filter row or a table wrapper, its own box was inflating THAT
          ancestor's scrollable area - visually exploding across the table instead of floating
          cleanly above it. `anchor` renders through a portal, fully outside that DOM subtree, so it
          can never inflate or clip against whatever happens to contain the trigger on a given page. */}
      <Popover.Panel anchor='bottom start' transition
        className='z-50 w-[280px] rounded-2xl bg-white border border-slate-100 shadow-xl dark:bg-[#161F30] dark:border-slate-800 dark:shadow-black/40 p-4 transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:6px]'>
        {({ close }) => (
          <DayPicker mode='single' selected={selected} locale={LOCALES[lang] || enUS} components={{ Chevron }}
            onSelect={(d) => { onChange(d ? toISODate(d) : ''); close() }} />
        )}
      </Popover.Panel>
    </Popover>
  )
}

export default DatePicker
