import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TeacherContext } from '../context/TeacherContext.jsx'
import { todayISO as todayStr } from '../lib/date.js'

const Timetable = () => {
  const { getMyTimetable } = useContext(TeacherContext)
  const navigate = useNavigate()
  const [date, setDate] = useState(todayStr())
  const [data, setData] = useState(null)

  useEffect(() => { getMyTimetable(date).then(setData) }, [date])

  return (
    <div className='px-5 pt-10 pb-10'>
      <div className='flex justify-between items-start mb-4'>
        <div>
          <button onClick={() => navigate('/')} className='text-muted text-sm mb-1'>‹ Back</button>
          <p className='font-display text-2xl text-ink'>My timetable</p>
        </div>
        <input type='date' value={date} onChange={e => setDate(e.target.value)} className='px-3 py-2 rounded-xl bg-bg-card border border-hairline text-sm' />
      </div>

      {!data ? <p className='text-muted'>Loading…</p> : (
        <div className='flex flex-col gap-3'>
          {data.lessons.map(l => (
            <div key={l.lessonId} className='bg-bg-card border border-hairline rounded-2xl p-4'>
              <div className='flex justify-between items-start'>
                <div>
                  <p className='text-ink font-medium'>{l.name || `${l.language} · ${l.level}`}</p>
                  <p className='text-muted text-sm'>{l.room}</p>
                </div>
                <div className='flex flex-col items-end gap-1'>
                  <span className='font-mono text-xs text-accent bg-accent-soft px-2 py-1 rounded-full'>{l.startTime}–{l.endTime}</span>
                  <span className='font-mono text-xs text-muted'>{l.studentCount} students</span>
                </div>
              </div>
            </div>
          ))}
          {data.lessons.length === 0 && <p className='text-muted'>No lessons scheduled for this day.</p>}
        </div>
      )}
    </div>
  )
}

export default Timetable
