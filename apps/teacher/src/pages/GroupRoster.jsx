import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TeacherContext } from '../context/TeacherContext.jsx'

const GroupRoster = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getGroupStudents } = useContext(TeacherContext)
  const [students, setStudents] = useState(false)

  useEffect(() => { getGroupStudents(id).then(setStudents) }, [id])

  return (
    <div className='px-5 pt-10 pb-10'>
      <button onClick={() => navigate('/')} className='text-muted text-sm mb-4'>‹ Back</button>
      <p className='font-display text-2xl text-ink mb-6'>Roster</p>

      {!students ? (
        <p className='text-muted'>Loading…</p>
      ) : (
        <div className='flex flex-col gap-3'>
          {students.map(s => (
            <button key={s.id} onClick={() => navigate(`/groups/${id}/students/${s.id}`)} className='text-left bg-bg-card border border-hairline rounded-xl p-4'>
              <div className='flex justify-between items-center mb-2'>
                <p className='text-ink font-medium'>{s.name}</p>
                <span className='font-mono text-sm text-accent'>{s.completionPercent}%</span>
              </div>
              <div className='h-1.5 rounded-full bg-hairline overflow-hidden'>
                <div className='h-full bg-accent rounded-full' style={{ width: `${s.completionPercent}%` }} />
              </div>
            </button>
          ))}
          {students.length === 0 && <p className='text-muted'>No students in this group yet.</p>}
        </div>
      )}
    </div>
  )
}

export default GroupRoster
