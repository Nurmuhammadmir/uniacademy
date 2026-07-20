import React, { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TeacherContext } from '../context/TeacherContext.jsx'
import { randomQuote } from '../lib/quotes.js'

// MON_WED_FRI groups meet on "odd" weekdays (toq kunlar), TUE_THU_SAT on "even" (juft kunlar) -
// the standard local convention for describing a 3x/week schedule. CUSTOM patterns don't fit
// either bucket, so they sort last.
const PARITY_ORDER = { MON_WED_FRI: 0, TUE_THU_SAT: 1, CUSTOM: 2 }
const PARITY_LABEL = { MON_WED_FRI: 'Odd days', TUE_THU_SAT: 'Even days', CUSTOM: 'Custom' }

const formatLessonWhen = (dateStr, time) => {
  const date = new Date(dateStr)
  const todayUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()))
  const diffDays = Math.round((date - todayUTC) / 86400000)
  const dayLabel = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${dayLabel} at ${time}`
}

const MyGroups = () => {
  const { groups, nextLesson } = useContext(TeacherContext)
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState('recent') // recent | top | schedule

  const sortedGroups = useMemo(() => {
    const list = [...groups]
    if (sortBy === 'recent') return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    if (sortBy === 'schedule') return list.sort((a, b) => (PARITY_ORDER[a.schedulePattern] ?? 3) - (PARITY_ORDER[b.schedulePattern] ?? 3) || a.time.localeCompare(b.time))
    return list.sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1))
  }, [groups, sortBy])

  return (
    <div className='px-5 pt-10 pb-10'>
      <div className='flex justify-between items-start mb-4'>
        <div>
          <p className='font-display text-2xl text-ink'>My groups</p>
          <p className='text-muted text-sm'>tap a group to see the roster</p>
        </div>
        <div className='flex gap-2'>
          <button onClick={() => navigate('/timetable')} className='w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center font-display text-sm'>🕐</button>
          <button onClick={() => navigate('/my-attendance')} className='w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center font-display text-sm'>📋</button>
          <button onClick={() => navigate('/profile')} className='w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center font-display text-sm'>👤</button>
        </div>
      </div>

      {nextLesson && (
        <div className='bg-accent text-white rounded-2xl px-4 py-3 mb-4'>
          <p className='text-xs opacity-80 mb-0.5'>Next lesson</p>
          <p className='font-medium'>{nextLesson.name || `${nextLesson.language} · ${nextLesson.level}`}</p>
          <p className='text-sm opacity-90'>{formatLessonWhen(nextLesson.date, nextLesson.time)}{nextLesson.room ? ` · ${nextLesson.room}` : ''}</p>
        </div>
      )}

      <div className='bg-accent-soft rounded-2xl px-4 py-3 mb-4'>
        <p className='text-ink text-sm italic'>"{randomQuote()}"</p>
      </div>

      <div className='flex gap-2 mb-4 flex-wrap'>
        <button onClick={() => setSortBy('recent')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${sortBy === 'recent' ? 'bg-accent text-white' : 'bg-bg-card border border-hairline text-muted'}`}>Recently added</button>
        <button onClick={() => setSortBy('top')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${sortBy === 'top' ? 'bg-accent text-white' : 'bg-bg-card border border-hairline text-muted'}`}>Top performing</button>
        <button onClick={() => setSortBy('schedule')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${sortBy === 'schedule' ? 'bg-accent text-white' : 'bg-bg-card border border-hairline text-muted'}`}>Odd/even days</button>
      </div>

      <div className='flex flex-col gap-3'>
        {sortedGroups.map(g => (
          <div key={g._id} className='bg-bg-card border border-hairline rounded-2xl p-4'>
            <button onClick={() => navigate(`/groups/${g._id}`)} className='w-full text-left'>
              <div className='flex justify-between items-start'>
                <div>
                  <p className='text-ink font-medium'>{g.name || `${g.languageId?.name} · ${g.levelId?.name}`}</p>
                  {g.name && <p className='text-muted text-xs'>{g.languageId?.name} · {g.levelId?.name}</p>}
                  <p className='text-muted text-sm'>{g.schedulePattern.replaceAll('_', '/')} · {g.time}{g.roomId?.name ? ` · ${g.roomId.name}` : ''}</p>
                  <p className='text-muted text-xs mt-0.5'>{PARITY_LABEL[g.schedulePattern] || ''}</p>
                </div>
                <div className='flex flex-col items-end gap-1'>
                  <span className='font-mono text-xs text-accent bg-accent-soft px-2 py-1 rounded-full'>day {g.dayCounter}/{g.levelId?.durationDays || 30}</span>
                  {g.averageScore !== null && g.averageScore !== undefined && (
                    <span className='font-mono text-xs text-muted'>avg {g.averageScore}%</span>
                  )}
                </div>
              </div>
            </button>
            <button onClick={() => navigate(`/groups/${g._id}/attendance`)} className='mt-3 w-full py-2 rounded-xl bg-accent text-white text-sm font-medium'>
              📷 Take attendance
            </button>
          </div>
        ))}
        {sortedGroups.length === 0 && <p className='text-muted'>You don't have any groups assigned yet.</p>}
      </div>
    </div>
  )
}

export default MyGroups
