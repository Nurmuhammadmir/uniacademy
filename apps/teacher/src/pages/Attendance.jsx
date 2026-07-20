import React, { useContext, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { TeacherContext } from '../context/TeacherContext.jsx'

const Attendance = () => {
  const { id: groupId } = useParams()
  const navigate = useNavigate()
  const { groups, createAttendanceSession, getAttendanceForDay, markStudentAttendance } = useContext(TeacherContext)
  const [session, setSession] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [roster, setRoster] = useState(null)
  const pollRef = useRef(null)

  const group = groups.find(g => g._id === groupId)

  const generate = async () => {
    const data = await createAttendanceSession(groupId)
    if (data) setSession(data)
  }

  useEffect(() => { generate() }, [groupId])

  useEffect(() => {
    if (!session) return
    const tick = () => setSecondsLeft(Math.max(0, Math.round((new Date(session.expiresAt) - Date.now()) / 1000)))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [session])

  const refreshRoster = () => session && getAttendanceForDay(groupId, session.day).then(setRoster)

  useEffect(() => {
    if (!session) return
    refreshRoster()
    pollRef.current = setInterval(refreshRoster, 4000)
    return () => clearInterval(pollRef.current)
  }, [session])

  const toggleManual = async (studentId, currentlyPresent) => {
    const ok = await markStudentAttendance(groupId, session.day, studentId, !currentlyPresent)
    if (ok) refreshRoster()
  }

  return (
    <div className='px-5 pt-10 pb-10'>
      <button onClick={() => navigate('/')} className='text-muted text-sm mb-4'>‹ Back</button>
      <p className='font-display text-2xl text-ink mb-1'>Attendance</p>
      <p className='text-muted text-sm mb-6'>{group?.languageId?.name} · {group?.levelId?.name} · day {session?.day}</p>

      <div className='bg-bg-card border border-hairline rounded-2xl p-6 flex flex-col items-center mb-6'>
        {session ? (
          <>
            <div className='bg-white p-4 rounded-2xl shadow-lg'>
              <QRCodeSVG value={session.token} size={220} bgColor='#ffffff' fgColor='#231F1A' level='M' />
            </div>
            <p className='font-mono text-muted text-sm mt-4'>
              {secondsLeft > 0 ? `expires in ${secondsLeft}s` : 'expired'}
            </p>
          </>
        ) : (
          <p className='text-muted'>Generating…</p>
        )}
        <button onClick={generate} className='mt-4 px-5 py-2 rounded-xl bg-accent text-white text-sm font-medium'>
          {secondsLeft > 0 ? 'Regenerate code' : 'Generate new code'}
        </button>
      </div>

      <div className='flex justify-between items-center mb-3'>
        <p className='text-ink font-medium'>Who's checked in</p>
        {roster && <span className='font-mono text-sm text-accent'>{roster.presentCount}/{roster.totalCount}</span>}
      </div>
      <p className='text-muted text-xs mb-3'>No phone? Tap a student to mark them present or absent manually.</p>

      <div className='flex flex-col gap-3'>
        {roster?.roster.map(s => (
          <button
            key={s.studentId}
            onClick={() => toggleManual(s.studentId, s.present)}
            className={`flex justify-between items-center rounded-xl px-4 py-3 border text-left ${s.present ? 'border-accent bg-accent-soft' : 'border-hairline bg-bg-card'}`}
          >
            <span className='text-ink'>{s.name}</span>
            <span className={`text-xs font-medium ${s.present ? 'text-accent' : 'text-muted'}`}>
              {s.present ? `✓ ${new Date(s.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'tap to mark present'}
            </span>
          </button>
        ))}
        {!roster && <p className='text-muted text-sm'>Loading roster…</p>}
      </div>
    </div>
  )
}

export default Attendance
