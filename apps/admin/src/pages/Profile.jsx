import React, { useContext } from 'react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const Profile = () => {
  const { me, logout } = useContext(AdminContext)
  const { t, lang, setLang, availableLanguages } = useLanguage()
  if (!me) return <p className='text-muted'>Loading…</p>

  return (
    <div>
      <p className='font-display text-2xl text-ink mb-6'>Profile</p>

      <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 mb-4 max-w-md'>
        <div className='w-14 h-14 rounded-full bg-accent-soft text-accent flex items-center justify-center font-display text-xl mb-4'>
          {me.admin.name?.[0]?.toUpperCase()}
        </div>
        <p className='text-ink font-medium text-lg mb-1'>{me.admin.name}</p>
        <p className='text-muted text-sm font-mono mb-1'>{me.admin.phone}</p>
        <p className='text-muted text-sm'>{me.admin.branchId?.name}</p>
      </div>

      <div className='grid grid-cols-2 gap-4 max-w-md mb-6'>
        <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
          <p className='text-muted text-xs mb-1'>Students in branch</p>
          <p className='font-mono text-2xl text-ink'>{me.studentCount}</p>
        </div>
        <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
          <p className='text-muted text-xs mb-1'>Active groups</p>
          <p className='font-mono text-2xl text-ink'>{me.activeGroupCount}</p>
        </div>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 max-w-md mb-6'>
        <p className='text-muted text-xs mb-2'>{t('language')}</p>
        <div className='flex flex-wrap gap-2'>
          {availableLanguages.map(l => (
            <button key={l.code} onClick={() => setLang(l.code)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${lang === l.code ? 'bg-accent text-white' : 'bg-bg border border-hairline text-ink'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={logout} className='max-w-md w-full py-3 rounded-xl border border-hairline text-muted font-medium'>
        {t('signOut')}
      </button>
    </div>
  )
}

export default Profile
