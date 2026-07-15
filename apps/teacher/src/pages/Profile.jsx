import React, { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TeacherContext } from '../context/TeacherContext.jsx'
import SelfAttendanceScanner from '../components/SelfAttendanceScanner.jsx'

const Profile = () => {
  const { me, logout } = useContext(TeacherContext)
  const navigate = useNavigate()
  const [showScanner, setShowScanner] = useState(false)

  return (
    <div className='px-5 pt-10 pb-10'>
      <button onClick={() => navigate('/')} className='text-muted text-sm mb-4'>‹ Back</button>
      <p className='font-display text-2xl text-ink mb-6'>Profile</p>

      {!me ? (
        <p className='text-muted'>Loading…</p>
      ) : (
        <>
          <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-4'>
            <div className='w-14 h-14 rounded-full bg-accent-soft text-accent flex items-center justify-center font-display text-xl mb-4'>
              {me.teacher.name?.[0]?.toUpperCase()}
            </div>
            <p className='text-ink font-medium text-lg mb-1'>{me.teacher.name}</p>
            <p className='text-muted text-sm font-mono mb-1'>{me.teacher.phone}</p>
            <p className='text-muted text-sm'>{me.teacher.branchId?.name}</p>
          </div>

          <div className='grid grid-cols-2 gap-4 mb-6'>
            <div className='bg-bg-card border border-hairline rounded-2xl p-5'>
              <p className='text-muted text-xs mb-1'>Active groups</p>
              <p className='font-mono text-2xl text-ink'>{me.activeGroupsCount}</p>
            </div>
            <div className='bg-bg-card border border-hairline rounded-2xl p-5'>
              <p className='text-muted text-xs mb-1'>Current students</p>
              <p className='font-mono text-2xl text-ink'>{me.totalStudents}</p>
            </div>
          </div>

          <p className='text-muted text-sm mb-6'>Working here since {new Date(me.employedSince).toLocaleDateString()}</p>

          <button onClick={() => setShowScanner(true)} className='w-full py-4 rounded-2xl bg-accent text-white font-medium mb-3'>
            📷 Check in for today
          </button>
        </>
      )}

      <button onClick={logout} className='w-full py-4 rounded-2xl border border-hairline text-muted font-medium'>
        Sign out
      </button>

      {showScanner && <SelfAttendanceScanner onClose={() => setShowScanner(false)} />}
    </div>
  )
}

export default Profile
