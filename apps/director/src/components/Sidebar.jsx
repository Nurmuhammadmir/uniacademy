import React, { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import { DirectorContext } from '../context/DirectorContext.jsx'
import Logo from './Logo.jsx'

const links = [
  { to: '/', label: 'Overview' },
  { to: '/branches', label: 'Branches map' },
  { to: '/students', label: 'Students' },
  { to: '/admins', label: 'Admins' },
  { to: '/teachers', label: 'Teachers' },
  { to: '/groups', label: 'Groups' },
  { to: '/courses', label: 'Courses' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/settings', label: 'Settings' },
]

const Sidebar = () => {
  const { logout } = useContext(DirectorContext)
  return (
    <aside className='w-60 fixed inset-y-0 left-0 bg-bg-elevated border-r border-hairline p-6 flex flex-col'>
      <div className='mb-1'><Logo size={30} /></div>
      <p className='text-xs mb-8 ml-10' style={{ color: '#C9A15C' }}>director</p>
      <nav className='flex flex-col gap-1 flex-1'>
        {links.map(link => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'}
            className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-accent-soft text-accent' : 'text-muted'}`}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <button onClick={logout} className='text-sm text-muted text-left px-3 py-2'>Sign out</button>
    </aside>
  )
}

export default Sidebar
