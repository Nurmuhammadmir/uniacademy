import React, { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import TeachersList from './TeachersList.jsx'
import Attendance from './Attendance.jsx'

const TABS = [
  ['list', 'teachersTitle'],
  ['attendance', 'attendanceTitle'],
]

const Teachers = () => {
  const { t } = useLanguage()
  const [tab, setTab] = useState('list')

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <p className='font-display text-2xl text-ink'>{t('teachersTitle')}</p>
        <div className='flex gap-2'>
          {TABS.map(([value, key]) => (
            <button key={value} onClick={() => setTab(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === value ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>
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
