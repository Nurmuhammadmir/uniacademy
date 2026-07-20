import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TeacherContext } from '../context/TeacherContext.jsx'
import HomeworkPreviewModal from '../components/HomeworkPreviewModal.jsx'

const SECTION_META = [
  { key: 'vocab', label: 'Vocab', icon: '🔤' },
  { key: 'grammar', label: 'Grammar', icon: '✏️' },
  { key: 'reading', label: 'Reading', icon: '📖' },
]

const GroupRoster = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getGroupStudents } = useContext(TeacherContext)
  const [students, setStudents] = useState(false)
  const [today, setToday] = useState(null)
  const [previewSection, setPreviewSection] = useState(null)

  useEffect(() => {
    setStudents(false)
    getGroupStudents(id).then(data => { setStudents(data.students); setToday(data.today) })
  }, [id])

  return (
    <div className='px-5 pt-10 pb-10'>
      <button onClick={() => navigate('/')} className='text-muted text-sm mb-4'>‹ Back</button>
      <p className='font-display text-2xl text-ink mb-4'>Roster</p>

      {today && (
        <div className='bg-bg-card border border-hairline rounded-2xl p-4 mb-6'>
          <div className='flex justify-between items-center mb-3'>
            <p className='text-ink font-medium'>Today's homework</p>
            <span className='font-mono text-xs text-accent bg-accent-soft px-2 py-1 rounded-full'>day {today.dayCounter}/{today.durationDays}</span>
          </div>
          <div className='grid grid-cols-3 gap-2'>
            {SECTION_META.map(s => (
              <button key={s.key} onClick={() => today[s.key] && setPreviewSection(s.key)} disabled={!today[s.key]}
                className={`rounded-xl p-3 text-center ${today[s.key] ? 'bg-accent-soft' : 'bg-bg border border-hairline opacity-50'}`}>
                <p className='text-lg mb-1'>{s.icon}</p>
                <p className={`text-xs font-medium ${today[s.key] ? 'text-accent' : 'text-muted'}`}>{s.label}</p>
                <p className='text-[10px] text-muted mt-0.5'>{today[s.key] ? 'tap to view' : 'no content'}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {previewSection && (
        <HomeworkPreviewModal groupId={id} initialSection={previewSection} onClose={() => setPreviewSection(null)} />
      )}

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
