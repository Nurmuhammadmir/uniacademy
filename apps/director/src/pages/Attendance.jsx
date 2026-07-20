import React, { useContext, useEffect, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { todayISO } from '../lib/date.js'

const Attendance = () => {
  const { getAttendanceOverview, branches } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [date, setDate] = useState(todayISO())
  const [data, setData] = useState(false)

  useEffect(() => { getAttendanceOverview(date).then(setData) }, [date])

  const branchName = (id) => branches.find(b => b._id === id)?.name || t('unassigned')

  if (!data) return <p className='text-muted'>{t('loadingAttendance')}</p>

  const teachersByBranch = {}
  data.teachers.forEach(tc => {
    const key = String(tc.branchId)
    if (!teachersByBranch[key]) teachersByBranch[key] = []
    teachersByBranch[key].push(tc)
  })

  const studentStatsByBranch = Object.fromEntries(data.studentAttendanceByBranch.map(r => [String(r._id), r]))

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <p className='font-display text-2xl text-ink'>{t('attendanceTitle')}</p>
        <input type='date' value={date} onChange={e => setDate(e.target.value)} className='px-3 py-2 rounded-xl bg-bg-elevated border border-hairline text-sm' />
      </div>

      <p className='text-ink font-medium mb-3'>{t('teacherCheckIns')}</p>
      <div className='grid grid-cols-2 gap-4 mb-8'>
        {Object.entries(teachersByBranch).map(([branchId, list]) => (
          <div key={branchId} className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
            <div className='flex justify-between items-center mb-3'>
              <p className='text-ink font-medium'>{branchName(branchId)}</p>
              <span className='font-mono text-sm text-accent'>{list.filter(tc => tc.checkedIn).length}/{list.length}</span>
            </div>
            <div className='flex flex-col gap-3'>
              {list.map(tc => (
                <div key={tc.teacherId} className='flex justify-between text-sm'>
                  <span className={tc.checkedIn ? 'text-ink' : 'text-muted'}>{tc.name}</span>
                  <span className={tc.checkedIn ? 'text-accent font-mono text-xs' : 'text-muted text-xs'}>
                    {tc.checkedIn ? new Date(tc.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t('notCheckedIn')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(teachersByBranch).length === 0 && <p className='text-muted col-span-2'>{t('noTeachersFound')}</p>}
      </div>

      <p className='text-ink font-medium mb-3'>{t('studentAttendanceByBranch')}</p>
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
              <p className='font-mono text-sm text-accent mt-1'>{t('percentAttended', { percent: stat?.percent ?? 0 })}</p>
            </div>
          )
        })}
      </div>

      <p className='text-ink font-medium mb-3'>{t('byGroup')}</p>
      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>{t('branch')}</th>
              <th className='px-5 py-3 font-medium'>{t('groupCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('teacherCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('presentCol')}</th>
            </tr>
          </thead>
          <tbody>
            {data.groups.map(g => (
              <tr key={g.groupId} className='border-b border-hairline last:border-0'>
                <td className='px-5 py-4 text-muted'>{g.branch}</td>
                <td className='px-5 py-4 text-ink'>{g.language} · {g.level}</td>
                <td className='px-5 py-4 text-muted'>{g.teacher}</td>
                <td className='px-5 py-4 font-mono text-accent'>{g.presentCount}/{g.totalCount}</td>
              </tr>
            ))}
            {data.groups.length === 0 && (
              <tr><td colSpan={4} className='px-5 py-8 text-center text-muted'>{t('noCheckInsForDate')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Attendance
