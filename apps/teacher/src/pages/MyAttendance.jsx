import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TeacherContext } from '../context/TeacherContext.jsx'
import { currentMonthISO } from '../lib/date.js'

const monthOptions = () => {
  const months = []
  const [y, m] = currentMonthISO().split('-').map(Number)
  for (let i = -5; i <= 0; i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1))
    months.push(d.toISOString().slice(0, 7))
  }
  return months
}

const STATUS_STYLE = {
  unmarked: 'bg-bg border border-hairline text-muted',
  conducted: 'bg-accent text-white',
  not_conducted: 'bg-red-500 text-white',
  substituted: 'bg-blue-400 text-white',
}
const STATUS_ICON = { unmarked: '—', conducted: '✓', not_conducted: '✕', substituted: '⇄' }

const MyAttendance = () => {
  const { getMyAttendanceGrid } = useContext(TeacherContext)
  const navigate = useNavigate()
  const [month, setMonth] = useState(currentMonthISO())
  const [grid, setGrid] = useState(null)

  useEffect(() => { getMyAttendanceGrid(month).then(setGrid) }, [month])

  return (
    <div className='px-5 pt-10 pb-10'>
      <button onClick={() => navigate('/')} className='text-muted text-sm mb-1'>‹ Back</button>
      <p className='font-display text-2xl text-ink mb-4'>My attendance</p>

      <div className='flex gap-2 overflow-x-auto mb-4 pb-1'>
        {monthOptions().map(m => (
          <button key={m} onClick={() => setMonth(m)} className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${m === month ? 'bg-accent text-white' : 'bg-bg-card border border-hairline text-muted'}`}>
            {new Date(m + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
          </button>
        ))}
      </div>

      {!grid ? <p className='text-muted'>Loading…</p> : (
        <div className='bg-bg-card border border-hairline rounded-2xl p-4'>
          <p className='text-muted text-sm mb-3'>{grid.stats.conducted}/{grid.stats.total} lessons conducted ({grid.stats.percent}%)</p>
          <div className='flex flex-col gap-4'>
            {grid.groups.map(g => (
              <div key={g.groupId}>
                <p className='text-ink text-sm font-medium mb-2'>{g.languageName} · {g.levelName}</p>
                <div className='flex gap-2 overflow-x-auto pb-1'>
                  {g.lessons.map(l => (
                    <div key={l.lessonId} className='flex flex-col items-center gap-1 flex-shrink-0'>
                      <span className='text-xs text-muted whitespace-nowrap'>{new Date(l.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${STATUS_STYLE[l.teacherStatus]}`}>
                        {STATUS_ICON[l.teacherStatus]}
                      </span>
                    </div>
                  ))}
                  {g.lessons.length === 0 && <p className='text-muted text-xs'>No lessons this month.</p>}
                </div>
              </div>
            ))}
            {grid.groups.length === 0 && <p className='text-muted text-sm'>No active groups yet.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default MyAttendance
