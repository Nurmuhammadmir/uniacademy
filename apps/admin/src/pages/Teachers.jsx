import React, { useContext, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { AdminContext } from '../context/AdminContext.jsx'
import TeachersList from './TeachersList.jsx'
import Attendance from './Attendance.jsx'

const TABS = [
  ['list', 'teachersTitle'],
  ['attendance', 'attendanceTitle'],
]

const Teachers = () => {
  const { t } = useLanguage()
  const { teachers } = useContext(AdminContext)
  const [tab, setTab] = useState('list')

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-baseline gap-3'>
          <p className='font-display text-2xl text-ink'>{t('teachersTitle')}</p>
          <span className='text-sm font-medium text-muted'>{t('groupsCountLabel', { count: teachers.length })}</span>
        </div>
        <div className='flex gap-1 bg-bg-elevated border border-hairline rounded-lg p-1'>
          {TABS.map(([value, key]) => (
            <button key={value} onClick={() => setTab(value)}
              className={`plain px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === value ? 'bg-slate-100 dark:bg-[#1E293B] text-[#1D1D1F] dark:text-[#F8FAFC] font-semibold' : 'text-slate-500 dark:text-[#94A3B8] hover:text-[#1D1D1F] dark:hover:text-[#F8FAFC]'}`}>
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'list' && <TeachersList />}
      {tab === 'attendance' && <Attendance />}
    </div>
  )
}

export default Teachers
