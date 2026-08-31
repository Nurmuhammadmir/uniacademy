import React from 'react'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const statusStyles = {
  done: 'bg-gold text-white',
  open: 'bg-accent-soft dark:bg-white/10 text-accent',
  rest: 'bg-hairline text-muted',
  expired: 'bg-hairline text-muted opacity-60',
}

// shows the current calendar window (real dates now, not abstract day numbers) as tappable chips -
// a lesson day still carries a real day number and the sliding-window status (rule #7); a rest day
// is a blank inert chip (nothing to do, not tappable); Sunday's review chip is always tappable.
// Keys include the array index as a tiebreaker so React never warns about duplicate keys.
const DayRow = ({ days, selectedDay, onSelect, groupDayCounter }) => {
  const { t } = useLanguage()
  return (
    <div className='flex gap-2 mb-6 overflow-x-auto pb-1'>
      {days.map((d, i) => {
        if (d.type === 'rest') {
          return (
            <div key={`rest-${i}`} className={`shrink-0 w-14 h-16 rounded-2xl flex flex-col items-center justify-center font-mono ${statusStyles.rest}`}>
              <span className='text-lg'>—</span>
              <span className='text-[10px] uppercase tracking-wide'>{t('dayRest')}</span>
            </div>
          )
        }
        if (d.type === 'review') {
          const isSelected = selectedDay === 'review'
          return (
            <button
              key={`review-${i}`}
              onClick={() => onSelect('review')}
              className={`shrink-0 w-14 h-16 rounded-2xl flex flex-col items-center justify-center font-mono ${isSelected ? 'ring-2 ring-accent' : ''} bg-gold/20 text-gold`}
            >
              <span className='text-lg'>↺</span>
              <span className='text-[10px] uppercase tracking-wide'>{t('dayReview')}</span>
            </button>
          )
        }
        const isSelected = d.day === selectedDay
        const label = d.status === 'done' ? t('dayDone')
          : d.status === 'expired' ? t('dayMissed')
          : d.day === groupDayCounter ? t('dayToday')
          : t('dayOpen')
        return (
          <button
            key={`${d.day}-${i}`}
            onClick={() => onSelect(d.day)}
            className={`shrink-0 w-14 h-16 rounded-2xl flex flex-col items-center justify-center font-mono ${isSelected ? 'ring-2 ring-accent' : ''} ${statusStyles[d.status] || statusStyles.open}`}
          >
            <span className='text-lg font-bold'>{d.day}</span>
            <span className='text-[10px] uppercase tracking-wide'>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default DayRow
