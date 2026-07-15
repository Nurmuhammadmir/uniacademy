import React, { useContext, useEffect, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'

const todayISO = () => new Date().toISOString().slice(0, 10)

const Attendance = () => {
  const { getAttendanceOverview, branches } = useContext(DirectorContext)
  const [date, setDate] = useState(todayISO())
  const [data, setData] = useState(false)

  useEffect(() => { getAttendanceOverview(date).then(setData) }, [date])

  const branchName = (id) => branches.find(b => b._id === id)?.name || 'Unassigned'

  if (!data) return <p className='text-muted'>Loading attendance…</p>

  const teachersByBranch = {}
  data.teachers.forEach(t => {
    const key = String(t.branchId)
    if (!teachersByBranch[key]) teachersByBranch[key] = []
    teachersByBranch[key].push(t)
  })

  const studentStatsByBranch = Object.fromEntries(data.studentAttendanceByBranch.map(r => [String(r._id), r]))

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <p className='font-display text-2xl text-ink'>Attendance</p>
        <input type='date' value={date} onChange={e => setDate(e.target.value)} className='px-3 py-2 rounded-xl bg-bg-elevated border border-hairline text-sm' />
      </div>

      <p className='text-ink font-medium mb-3'>Teacher check-ins, by branch</p>
      <div className='grid grid-cols-2 gap-4 mb-8'>
        {Object.entries(teachersByBranch).map(([branchId, list]) => (
          <div key={branchId} className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
            <div className='flex justify-between items-center mb-3'>
              <p className='text-ink font-medium'>{branchName(branchId)}</p>
              <span className='font-mono text-sm text-accent'>{list.filter(t => t.checkedIn).length}/{list.length}</span>
            </div>
            <div className='flex flex-col gap-1'>
              {list.map(t => (
                <div key={t.teacherId} className='flex justify-between text-sm'>
                  <span className={t.checkedIn ? 'text-ink' : 'text-muted'}>{t.name}</span>
                  <span className={t.checkedIn ? 'text-accent font-mono text-xs' : 'text-muted text-xs'}>
                    {t.checkedIn ? new Date(t.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'not checked in'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(teachersByBranch).length === 0 && <p className='text-muted col-span-2'>No teachers found.</p>}
      </div>

      <p className='text-ink font-medium mb-3'>Student check-ins, by branch</p>
      <div className='grid grid-cols-4 gap-4 mb-8'>
        {branches.map(b => {
          const stat = studentStatsByBranch[b._id]
          return (
            <div key={b._id} className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
              <p className='text-muted text-sm mb-1'>{b.name}</p>
              <div className='flex items-baseline gap-2'>
                <p className='font-mono text-2xl text-ink'>{stat?.count || 0}</p>
                <p className='text-muted text-sm'>/ {stat?.total || 0}</p>
              </div>
              <p className='font-mono text-sm text-accent mt-1'>{stat?.percent ?? 0}% attended</p>
            </div>
          )
        })}
      </div>

      <p className='text-ink font-medium mb-3'>By group</p>
      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>Branch</th>
              <th className='px-5 py-3 font-medium'>Group</th>
              <th className='px-5 py-3 font-medium'>Teacher</th>
              <th className='px-5 py-3 font-medium'>Present</th>
            </tr>
          </thead>
          <tbody>
            {data.groups.map(g => (
              <tr key={g.groupId} className='border-b border-hairline last:border-0'>
                <td className='px-5 py-3 text-muted'>{g.branch}</td>
                <td className='px-5 py-3 text-ink'>{g.language} · {g.level}</td>
                <td className='px-5 py-3 text-muted'>{g.teacher}</td>
                <td className='px-5 py-3 font-mono text-accent'>{g.presentCount}/{g.totalCount}</td>
              </tr>
            ))}
            {data.groups.length === 0 && (
              <tr><td colSpan={4} className='px-5 py-8 text-center text-muted'>No student check-ins recorded for this date.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Attendance
