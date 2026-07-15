import React, { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TeacherContext } from '../context/TeacherContext.jsx'
import { randomQuote } from '../lib/quotes.js'

const MyGroups = () => {
  const { groups } = useContext(TeacherContext)
  const navigate = useNavigate()
  const [sortBy, setSortBy] = useState('recent') // recent | top

  const sortedGroups = useMemo(() => {
    const list = [...groups]
    if (sortBy === 'recent') return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return list.sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1))
  }, [groups, sortBy])

  return (
    <div className='px-5 pt-10 pb-10'>
      <div className='flex justify-between items-start mb-4'>
        <div>
          <p className='font-display text-2xl text-ink'>My groups</p>
          <p className='text-muted text-sm'>tap a group to see the roster</p>
        </div>
        <button onClick={() => navigate('/profile')} className='w-9 h-9 rounded-full bg-accent-soft text-accent flex items-center justify-center font-display text-sm'>👤</button>
      </div>

      <div className='bg-accent-soft rounded-2xl px-4 py-3 mb-4'>
        <p className='text-ink text-sm italic'>"{randomQuote()}"</p>
      </div>

      <div className='flex gap-2 mb-4'>
        <button onClick={() => setSortBy('recent')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${sortBy === 'recent' ? 'bg-accent text-white' : 'bg-bg-card border border-hairline text-muted'}`}>Recently added</button>
        <button onClick={() => setSortBy('top')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${sortBy === 'top' ? 'bg-accent text-white' : 'bg-bg-card border border-hairline text-muted'}`}>Top performing</button>
      </div>

      <div className='flex flex-col gap-3'>
        {sortedGroups.map(g => (
          <div key={g._id} className='bg-bg-card border border-hairline rounded-2xl p-4'>
            <button onClick={() => navigate(`/groups/${g._id}`)} className='w-full text-left'>
              <div className='flex justify-between items-start'>
                <div>
                  <p className='text-ink font-medium'>{g.languageId?.name} · {g.levelId?.name}</p>
                  <p className='text-muted text-sm'>{g.schedulePattern.replaceAll('_', '/')} · {g.time}</p>
                </div>
                <div className='flex flex-col items-end gap-1'>
                  <span className='font-mono text-xs text-accent bg-accent-soft px-2 py-1 rounded-full'>day {g.dayCounter}/30</span>
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
