import React, { useContext, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, Trophy, UserPlus, Languages, CalendarCheck, GraduationCap } from 'lucide-react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import BranchProfileModal from '../components/BranchProfileModal.jsx'
import { formatMoney } from '../lib/format.js'

const SECTION_ICON = 'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0'

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
      </div>

      <div className='flex items-center gap-2 mb-3'>
        <span className={`${SECTION_ICON} bg-accent-soft text-accent`}><TrendingUp size={16} strokeWidth={2} /></span>
        <p className='text-ink font-medium'>{t('revenueByBranch')}</p>
      </div>
      <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 mb-8 shadow-sm' style={{ height: 260 }}>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={revenueChartData}>
            <CartesianGrid strokeDasharray='3 3' stroke='#E9E1D4' />
            <XAxis dataKey='name' stroke='#7A7266' fontSize={12} />
            <YAxis stroke='#7A7266' fontSize={12} tickFormatter={formatMoney} />
            <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E9E1D4', borderRadius: 12 }} formatter={(value) => formatMoney(value)} />
            <Bar dataKey='revenue' fill='#4B4FE0' radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
        <div>
          <div className='flex items-center gap-2 mb-3'>
            <span className={`${SECTION_ICON} bg-gold/15 text-gold`}><Trophy size={16} strokeWidth={2} /></span>
            <p className='text-ink font-medium'>{t('topTeachersActive')}</p>
          </div>
          <div className='flex flex-col gap-2'>
            {stats.topTeachers?.map((tt, i) => (
              <div key={tt.teacherId} className='bg-bg-elevated border border-hairline rounded-xl p-4 flex justify-between items-center shadow-sm transition-shadow hover:shadow-md'>
                <span className='flex items-center gap-3 min-w-0'>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold ${i === 0 ? 'bg-gold text-white' : 'bg-bg text-muted'}`}>{i + 1}</span>
                  <span className='text-ink font-medium truncate'>{tt.teacher?.name}</span>
                  <span className='text-muted text-xs flex-shrink-0'>{tt.teacher?.branchId?.name}</span>
                </span>
                <span className='font-mono text-accent flex-shrink-0'>{t('studentsSuffix', { count: tt.count })}</span>
              </div>
            ))}
            {(!stats.topTeachers || stats.topTeachers.length === 0) && <p className='text-muted text-sm'>{t('noActiveGroupsYet')}</p>}
          </div>
        </div>

        <div>
          <div className='flex items-center gap-2 mb-3'>
            <span className={`${SECTION_ICON} bg-emerald-500/15 text-emerald-600`}><UserPlus size={16} strokeWidth={2} /></span>
            <p className='text-ink font-medium'>{t('newStudentsThisMonth')}</p>
          </div>
          <div className='flex flex-col gap-2'>
            {branches.map(b => (
              <button key={b._id} onClick={() => setViewingBranchId(b._id)}
                className='plain bg-bg-elevated border border-hairline rounded-xl p-4 flex justify-between items-center text-left shadow-sm transition-all hover:shadow-md hover:border-accent/30'>
                <span className='text-ink'>{b.name}</span>
                <span className='font-mono text-emerald-600 font-medium'>+{newStudentsByBranchMap[b._id] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className='flex items-center gap-2 mb-3'>
        <span className={`${SECTION_ICON} bg-accent-soft text-accent`}><Languages size={16} strokeWidth={2} /></span>
        <p className='text-ink font-medium'>{t('newEnrollmentsByLang')}</p>
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8'>
        {languages.map(l => (
          <div key={l._id} className='bg-bg-elevated border border-hairline rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md'>
            <p className='text-muted text-sm mb-1 truncate'>{l.name}</p>
            <p className='font-mono text-2xl text-ink font-semibold'>+{newEnrollmentsByLanguageMap[l._id] || 0}</p>
          </div>
        ))}
      </div>

      <div className='flex items-center gap-2 mb-3'>
        <span className={`${SECTION_ICON} bg-gold/15 text-gold`}><CalendarCheck size={16} strokeWidth={2} /></span>
        <p className='text-ink font-medium'>{t('teacherAttendanceQuality')}</p>
      </div>
      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden overflow-x-auto mb-8 shadow-sm'>
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
              <tr key={row.teacherId} className='border-b border-hairline last:border-0 transition-colors hover:bg-bg'>
                <td className='px-5 py-3 text-ink'>{row.name}</td>
                <td className='px-5 py-3 text-muted'>{row.branchName}</td>
                <td className='px-5 py-3 text-muted font-mono'>{row.sessionCount}</td>
                <td className='px-5 py-3'>
                  {row.averageAttendancePercent === null ? (
                    <span className='text-muted text-xs'>{t('noDataYet')}</span>
                  ) : (
                    <span className='font-mono text-accent font-medium'>{row.averageAttendancePercent}%</span>
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

      <div className='block md:hidden flex flex-col gap-2.5 mb-8'>
        {(!stats.teacherAttendanceRates || stats.teacherAttendanceRates.length === 0) && (
          <p className='text-muted text-sm text-center py-8'>{t('noTeachersYet')}</p>
        )}
        {stats.teacherAttendanceRates?.map(row => (
          <div key={row.teacherId} className='bg-bg-elevated border border-hairline rounded-2xl p-4 flex justify-between items-center gap-2 shadow-sm'>
            <div className='min-w-0'>
              <p className='text-ink font-medium text-sm truncate'>{row.name}</p>
              <p className='text-muted text-xs mt-0.5'>{row.branchName} · {row.sessionCount} {t('sessionsRecorded')}</p>
            </div>
            {row.averageAttendancePercent === null ? (
              <span className='text-muted text-xs flex-shrink-0'>{t('noDataYet')}</span>
            ) : (
              <span className='font-mono text-accent font-medium flex-shrink-0'>{row.averageAttendancePercent}%</span>
            )}
          </div>
        ))}
      </div>

      <div className='flex items-center gap-2 mb-3'>
        <span className={`${SECTION_ICON} bg-emerald-500/15 text-emerald-600`}><GraduationCap size={16} strokeWidth={2} /></span>
        <p className='text-ink font-medium'>{t('studentsByLanguage')}</p>
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
        {stats.studentsByLanguage.map(row => (
          <div key={row._id} className='bg-bg-elevated border border-hairline rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md'>
            <p className='text-muted text-sm mb-1 truncate'>{languageName(row._id)}</p>
            <p className='font-mono text-2xl text-ink font-semibold'>{row.students}</p>
          </div>
        ))}
        {stats.studentsByLanguage.length === 0 && <p className='text-muted col-span-2 sm:col-span-4'>{t('noGroupEnrollmentsYet')}</p>}
      </div>

      {viewingBranchId && (
        <BranchProfileModal branchId={viewingBranchId} getBranchProfile={getBranchProfile} onClose={() => setViewingBranchId(null)} />
      )}
    </div>
  )
}

export default Overview
