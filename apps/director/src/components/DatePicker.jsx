import React from 'react'
import { Popover } from '@headlessui/react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { enUS, ru, uz } from 'react-day-picker/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const LOCALES = { en: enUS, ru, uz }
const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// plain DD.MM.YYYY instead of toLocaleDateString(...,{month:'short'}) - uz-UZ doesn't have short
// month names in every browser/Node's bundled ICU data, which could silently fall back to a garbled
// non-date string instead of a real month abbreviation. A fixed numeric format sidesteps that
// entirely and reads the same in every language.
const formatDMY = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`

// react-day-picker's own Chevron renders a plain SVG that reads as heavy/mismatched next to the
// rest of the app's lucide icon set - swap it for the real thing
const Chevron = ({ orientation, ...props }) => {
  const Icon = orientation === 'left' ? ChevronLeft : ChevronRight
  return <Icon size={16} strokeWidth={1.5} {...props} />
}

// premium replacement for the native <input type="date"> - no more browser-native "Clear"/"Today"
// chrome fighting the rest of the design. The closed field matches Select.jsx's look (rounded,
// border-hairline) with a calendar glyph from lucide-react; the open calendar is react-day-picker's
// own popover, its accent color and selected-day fill re-pointed at this app's runtime-switchable
// --accent/--accent-soft custom properties in index.css instead of react-day-picker's default blue,
// and localized (weekday/month names, first-day-of-week) to whatever language the platform is
// currently showing - see i18n/LanguageContext.jsx.
const DatePicker = ({ value, onChange, className = '' }) => {
  const { lang } = useLanguage()
  const selected = value ? new Date(value + 'T00:00:00') : undefined
  const formatted = selected ? formatDMY(selected) : ''

  return (
    <Popover className={className}>
      <Popover.Button className='plain w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-bg-elevated border border-hairline text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent transition-shadow'>
        <CalendarDays size={16} className='text-muted flex-shrink-0' />
        <span className={formatted ? 'text-ink' : 'text-muted'}>{formatted || '—'}</span>
      </Popover.Button>
      {/* `anchor` (Headless UI's Floating-UI-backed positioning) instead of a manually
          `absolute`-positioned panel - a plain `absolute` panel is still laid out INSIDE its nearest
          scrolling/overflow ancestor, so dropped into a filter row or table wrapper its own box was
          inflating THAT ancestor's scrollable area instead of floating cleanly above it. `anchor`
          renders through a portal, fully outside that DOM subtree. */}
      <Popover.Panel anchor='bottom start' transition
        className='z-50 w-[280px] rounded-xl bg-bg-elevated border border-hairline shadow-xl p-3 transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:6px]'>
        {({ close }) => (
          <DayPicker mode='single' selected={selected} locale={LOCALES[lang] || enUS} components={{ Chevron }}
            onSelect={(d) => { onChange(d ? toISODate(d) : ''); close() }} />
        )}
      </Popover.Panel>
    </Popover>
  )
}

export default DatePicker
