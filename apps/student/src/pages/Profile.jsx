import React, { useContext } from 'react'
import { StudentContext } from '../context/StudentContext.jsx'
import { formatMoney } from '../lib/format.js'

const CourseCard = ({ course }) => {
  const remaining = course.price ? Math.max(0, course.price - course.balance) : null
  return (
    <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-3'>
      <div className='flex justify-between items-start mb-2'>
        <p className='text-ink font-medium'>{course.languageId?.name} · {course.levelId?.name}</p>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${course.isActive ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>
          {course.isActive ? 'active' : 'unpaid'}
        </span>
      </div>
      <div className='grid grid-cols-2 gap-2 text-sm'>
        <div><p className='text-muted text-xs'>Monthly price</p><p className='font-mono text-ink'>{course.price !== null ? formatMoney(course.price) : '—'}</p></div>
        <div><p className='text-muted text-xs'>Total paid</p><p className='font-mono text-ink'>{formatMoney(course.totalPaid)}</p></div>
        <div><p className='text-muted text-xs'>Balance</p><p className='font-mono text-ink'>{formatMoney(course.balance)}</p></div>
        <div><p className='text-muted text-xs'>Next due</p><p className='font-mono text-ink'>{course.subscriptionExpiresAt ? new Date(course.subscriptionExpiresAt).toLocaleDateString() : '—'}</p></div>
      </div>
      {!course.isActive && remaining !== null && remaining > 0 && (
        <p className='text-xs text-accent mt-2'>{formatMoney(remaining)} more needed to activate this course</p>
      )}
    </div>
  )
}

const Profile = () => {
  const { me, logout } = useContext(StudentContext)
  if (!me) return <div className='px-6 pt-16 text-muted'>Loading…</div>

  const { student, courses } = me

  return (
    <div className='px-5 pt-10'>
      <p className='font-display text-2xl text-ink mb-6'>Profile</p>

      <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-4'>
        <div className='w-14 h-14 rounded-full bg-accent-soft text-accent flex items-center justify-center font-display text-xl mb-4'>
          {student.name?.[0]?.toUpperCase()}
        </div>
        <p className='text-ink font-medium text-lg mb-1'>{student.name}</p>
        <p className='text-muted text-sm font-mono mb-1'>{student.phone}</p>
        <p className='text-muted text-sm'>{student.branchId?.name}</p>
      </div>

      <p className='text-ink font-medium mb-2'>My courses</p>
      {courses.map(c => <CourseCard key={c._id} course={c} />)}
      {courses.length === 0 && <p className='text-muted text-sm mb-4'>No course assigned yet - ask your branch admin.</p>}

      <button onClick={logout} className='w-full py-4 rounded-2xl border border-hairline text-muted font-medium mt-3'>
        Sign out
      </button>
    </div>
  )
}

export default Profile
