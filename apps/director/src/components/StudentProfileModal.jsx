import React, { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { formatMoney } from '../lib/format.js'

// director sees everything admin sees, PLUS address/geo - only the director is allowed to see
// where a student lives
const StudentProfileModal = ({ studentId, getStudentProfile, onClose }) => {
  const [data, setData] = useState(false)

  useEffect(() => { getStudentProfile(studentId).then(setData) }, [studentId])

  return (
    <Modal title='Student profile' onClose={onClose} wide>
      {!data ? (
        <p className='text-muted'>Loading…</p>
      ) : (
        <div className='flex flex-col gap-5'>
          <div>
            <p className='font-display text-xl text-ink'>{data.student.name}</p>
            <p className='text-muted text-sm font-mono'>{data.student.phone}</p>
            <p className='text-muted text-xs mt-1'>Registered {new Date(data.student.createdAt).toLocaleDateString()} · {data.student.branchId?.name}</p>
          </div>

          {data.student.passportInfo && (
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>Passport / ID info</p>
              <p className='text-ink text-sm'>{data.student.passportInfo}</p>
            </div>
          )}

          <div>
            <p className='text-ink font-medium mb-2'>Courses</p>
            <div className='grid grid-cols-2 gap-3'>
              {data.courses.map(c => (
                <div key={c._id} className='bg-bg border border-hairline rounded-xl p-4'>
                  <div className='flex justify-between items-start mb-1'>
                    <p className='text-ink text-sm font-medium'>{c.languageId?.name} · {c.levelId?.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>{c.isActive ? 'active' : 'unpaid'}</span>
                  </div>
                  <p className='text-muted text-xs'>price {c.price !== null ? formatMoney(c.price) : '—'} · balance {formatMoney(c.balance)}</p>
                  <p className='text-muted text-xs'>next due {c.subscriptionExpiresAt ? new Date(c.subscriptionExpiresAt).toLocaleDateString() : '—'}</p>
                </div>
              ))}
              {data.courses.length === 0 && <p className='text-muted text-sm col-span-2'>No courses yet.</p>}
            </div>
          </div>

          <div className='bg-bg border border-hairline rounded-xl p-4'>
            <p className='text-muted text-xs mb-1'>Address</p>
            <p className='text-ink'>{data.student.address || '—'}</p>
            {data.student.geo?.lat && (
              <p className='text-muted text-xs mt-1 font-mono'>{data.student.geo.lat.toFixed(5)}, {data.student.geo.lng.toFixed(5)}</p>
            )}
          </div>

          <div>
            <p className='text-ink font-medium mb-2'>Payment history</p>
            <div className='flex flex-col gap-1'>
              {data.payments.map(p => (
                <div key={p._id} className='flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-muted'>{new Date(p.date).toLocaleDateString()} · {p.languageId?.name} · by {p.adminId?.name}</span>
                  <span className='font-mono text-ink'>{formatMoney(p.amount)}</span>
                </div>
              ))}
              {data.payments.length === 0 && <p className='text-muted text-sm'>No payments yet.</p>}
            </div>
          </div>

          <div>
            <p className='text-ink font-medium mb-2'>Exam results</p>
            <div className='flex flex-col gap-1'>
              {data.examAttempts?.map(a => (
                <div key={a._id} className='flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-muted'>{a.examId?.languageId?.name} · {a.examId?.levelId?.name} · attempt #{a.attemptNumber}</span>
                  <span className={a.passed ? 'text-accent font-mono' : 'text-red-500 font-mono'}>{a.score}%</span>
                </div>
              ))}
              {(!data.examAttempts || data.examAttempts.length === 0) && <p className='text-muted text-sm'>No exams taken yet.</p>}
            </div>
          </div>

          <div>
            <p className='text-ink font-medium mb-2'>Group history</p>
            <div className='flex flex-col gap-1'>
              {data.groups.map(g => (
                <div key={g._id} className='flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-ink'>{g.languageId?.name} · {g.levelId?.name} · teacher {g.teacherId?.name}</span>
                  <span className='text-muted'>{g.status}</span>
                </div>
              ))}
              {data.groups.length === 0 && <p className='text-muted text-sm'>Not placed in any group yet.</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default StudentProfileModal
