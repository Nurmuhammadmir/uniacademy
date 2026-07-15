import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TeacherContext } from '../context/TeacherContext.jsx'

const statusLabel = { done: 'Done', open: 'In progress', expired: 'Missed', locked: 'Not yet' }
const statusColor = { done: 'text-accent bg-accent-soft', open: 'text-ink bg-hairline', expired: 'text-red-500 bg-red-50', locked: 'text-muted bg-hairline' }

const StudentDetail = () => {
  const { id: groupId, studentId } = useParams()
  const navigate = useNavigate()
  const { getStudentDayDetail } = useContext(TeacherContext)
  const [data, setData] = useState(false)

  useEffect(() => { getStudentDayDetail(groupId, studentId).then(setData) }, [groupId, studentId])

  return (
    <div className='px-5 pt-10 pb-10'>
      <button onClick={() => navigate(-1)} className='text-muted text-sm mb-4'>‹ Back</button>

      {!data ? (
        <p className='text-muted'>Loading…</p>
      ) : (
        <>
          <p className='font-display text-2xl text-ink mb-1'>{data.student.name}</p>
          <p className='text-muted text-sm font-mono mb-6'>{data.student.phone}</p>

          <div className='flex flex-col gap-2'>
            {data.days.map(row => (
              <div key={row._id} className='bg-bg-card border border-hairline rounded-xl p-4'>
                <div className='flex justify-between items-center mb-2'>
                  <p className='text-ink font-medium'>Day {row.day}</p>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[row.status] || statusColor.open}`}>
                    {statusLabel[row.status] || row.status}
                  </span>
                </div>
                <div className='grid grid-cols-3 gap-2 text-center'>
                  <div><p className='text-muted text-xs'>Vocab</p><p className='font-mono text-ink'>{row.vocabScore ?? '—'}</p></div>
                  <div><p className='text-muted text-xs'>Grammar</p><p className='font-mono text-ink'>{row.grammarScore ?? '—'}</p></div>
                  <div><p className='text-muted text-xs'>Reading</p><p className='font-mono text-ink'>{row.readingScore ?? '—'}</p></div>
                </div>
              </div>
            ))}
            {data.days.length === 0 && <p className='text-muted'>No homework activity recorded yet.</p>}
          </div>

          <p className='text-ink font-medium mt-6 mb-2'>Exam results</p>
          <div className='flex flex-col gap-2'>
            {data.examAttempts?.map(a => (
              <div key={a._id} className='bg-bg-card border border-hairline rounded-xl p-4 flex justify-between items-center'>
                <div>
                  <p className='text-ink text-sm'>{a.examId?.languageId?.name} · {a.examId?.levelId?.name}</p>
                  <p className='text-muted text-xs'>{new Date(a.date).toLocaleDateString()} · attempt #{a.attemptNumber}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${a.passed ? 'bg-accent-soft text-accent' : 'bg-red-100 text-red-500'}`}>
                  {a.score}% · {a.passed ? 'Passed' : 'Failed'}
                </span>
              </div>
            ))}
            {(!data.examAttempts || data.examAttempts.length === 0) && <p className='text-muted text-sm'>No exams taken yet.</p>}
          </div>
        </>
      )}
    </div>
  )
}

export default StudentDetail
