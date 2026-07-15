import React from 'react'

const statusStyles = {
  done: 'bg-gold text-white',
  open: 'bg-accent-soft text-accent',
  rest: 'bg-hairline text-muted',
  expired: 'bg-hairline text-muted opacity-60',
}

// shows the days currently inside the sliding window (rule #7) as tappable chips. Keys include the
// array index as a tiebreaker so React never warns about duplicate keys even if the backend ever
// returns an edge-case window with a repeated day number.
const DayRow = ({ days, selectedDay, onSelect, groupDayCounter }) => {
  return (
    <div className='flex gap-2 mb-6 overflow-x-auto pb-1'>
      {days.map((d, i) => {
        const isSelected = d.day === selectedDay
        const label = d.status === 'rest' ? 'rest'
          : d.status === 'done' ? 'done'
          : d.status === 'expired' ? 'missed'
          : d.day === groupDayCounter ? 'today'
          : 'open'
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
