import React, { useContext, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import BranchProfileModal from '../components/BranchProfileModal.jsx'
import { formatMoney } from '../lib/format.js'

const Overview = () => {
  const { stats, branches, languages, getBranchProfile } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [viewingBranchId, setViewingBranchId] = useState(null)
  const branchName = (id) => branches.find(b => b._id === id)?.name || t('unassigned')
  const languageName = (id) => languages.find(l => l._id === id)?.name || t('unknown')

  if (!stats) return <p className='text-muted'>{t('loading')}</p>

  const revenueChartData = stats.revenueByBranch.map(row => ({ name: branchName(row._id), revenue: row.revenue }))
  const newStudentsByBranchMap = Object.fromEntries((stats.monthlyNewStudentsByBranch || []).map(r => [String(r._id), r.count]))
  const newEnrollmentsByLanguageMap = Object.fromEntries((stats.monthlyNewEnrollmentsByLanguage || []).map(r => [String(r._id), r.count]))

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <p className='font-display text-2xl text-ink'>{t('navOverview')}</p>
        <div className='bg-accent-soft rounded-xl px-4 py-2 text-right'>
          <p className='text-xs text-muted'>{t('revenueThisMonth')}</p>
          <p className='font-mono text-lg text-accent'>{formatMoney(stats.monthlyRevenue || 0)}</p>
        </div>
      </div>

      <p className='text-ink font-medium mb-3'>{t('revenueByBranch')}</p>
      <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 mb-8' style={{ height: 260 }}>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={revenueChartData}>
            <CartesianGrid strokeDasharray='3 3' stroke='#E9E1D4' />
            <XAxis dataKey='name' stroke='#7A7266' fontSize={12} />
            <YAxis stroke='#7A7266' fontSize={12} tickFormatter={formatMoney} />
            <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E9E1D4', borderRadius: 8 }} formatter={(value) => formatMoney(value)} />
            <Bar dataKey='revenue' fill='#4B4FE0' radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='grid grid-cols-2 gap-6 mb-8'>
        <div>
          <p className='text-ink font-medium mb-3'>🏆 {t('topTeachersActive')}</p>
          <div className='flex flex-col gap-2'>
            {stats.topTeachers?.map((tt, i) => (
              <div key={tt.teacherId} className='bg-bg-elevated border border-hairline rounded-xl p-4 flex justify-between items-center'>
                <span className='flex items-center gap-3'>
                  <span className='font-mono text-lg text-gold'>#{i + 1}</span>
                  <span className='text-ink font-medium'>{tt.teacher?.name}</span>
                  <span className='text-muted text-xs'>{tt.teacher?.branchId?.name}</span>
                </span>
                <span className='font-mono text-accent'>{t('studentsSuffix', { count: tt.count })}</span>
              </div>
            ))}
            {(!stats.topTeachers || stats.topTeachers.length === 0) && <p className='text-muted text-sm'>{t('noActiveGroupsYet')}</p>}
          </div>
        </div>

        <div>
          <p className='text-ink font-medium mb-3'>{t('newStudentsThisMonth')}</p>
          <div className='flex flex-col gap-2'>
            {branches.map(b => (
              <button key={b._id} onClick={() => setViewingBranchId(b._id)} className='bg-bg-elevated border border-hairline rounded-xl p-4 flex justify-between items-center hover:underline text-left'>
                <span className='text-ink'>{b.name}</span>
                <span className='font-mono text-accent'>+{newStudentsByBranchMap[b._id] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className='text-ink font-medium mb-3'>{t('newEnrollmentsByLang')}</p>
      <div className='grid grid-cols-4 gap-4 mb-8'>
        {languages.map(l => (
          <div key={l._id} className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
            <p className='text-muted text-sm mb-1'>{l.name}</p>
            <p className='font-mono text-2xl text-ink'>+{newEnrollmentsByLanguageMap[l._id] || 0}</p>
          </div>
        ))}
      </div>

      <p className='text-ink font-medium mb-3'>{t('teacherAttendanceQuality')}</p>
      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden mb-8'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>{t('teacherCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('branchCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('sessionsRecorded')}</th>
              <th className='px-5 py-3 font-medium'>{t('averageAttendance')}</th>
            </tr>
          </thead>
          <tbody>
            {stats.teacherAttendanceRates?.map(row => (
              <tr key={row.teacherId} className='border-b border-hairline last:border-0'>
                <td className='px-5 py-3 text-ink'>{row.name}</td>
                <td className='px-5 py-3 text-muted'>{row.branchName}</td>
                <td className='px-5 py-3 text-muted font-mono'>{row.sessionCount}</td>
                <td className='px-5 py-3'>
                  {row.averageAttendancePercent === null ? (
                    <span className='text-muted text-xs'>{t('noDataYet')}</span>
                  ) : (
                    <span className='font-mono text-accent'>{row.averageAttendancePercent}%</span>
                  )}
                </td>
              </tr>
            ))}
            {(!stats.teacherAttendanceRates || stats.teacherAttendanceRates.length === 0) && (
              <tr><td colSpan={4} className='px-5 py-8 text-center text-muted'>{t('noTeachersYet')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className='text-ink font-medium mb-3'>{t('studentsByLanguage')}</p>
      <div className='grid grid-cols-4 gap-4'>
        {stats.studentsByLanguage.map(row => (
          <div key={row._id} className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
            <p className='text-muted text-sm mb-1'>{languageName(row._id)}</p>
            <p className='font-mono text-2xl text-ink'>{row.students}</p>
          </div>
        ))}
        {stats.studentsByLanguage.length === 0 && <p className='text-muted col-span-4'>{t('noGroupEnrollmentsYet')}</p>}
      </div>

      {viewingBranchId && (
        <BranchProfileModal branchId={viewingBranchId} getBranchProfile={getBranchProfile} onClose={() => setViewingBranchId(null)} />
      )}
    </div>
  )
}

export default Overview
