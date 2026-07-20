import React from 'react'
import { NavLink } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const BottomNav = () => {
  const { t } = useLanguage()
  const tabs = [
    { to: '/', label: t('navHome'), icon: '🏠' },
    { to: '/profile', label: t('navProfile'), icon: '👤' },
  ]

  return (
    <nav className='fixed bottom-0 left-0 right-0 bg-bg-elevated border-t border-hairline flex'>
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium ${isActive ? 'text-accent' : 'text-muted'}`}
        >
          <span className='text-xl leading-none'>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default BottomNav
