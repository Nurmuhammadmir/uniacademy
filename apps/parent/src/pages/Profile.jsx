import React, { useContext } from 'react'
import { ParentContext } from '../context/ParentContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import FontSizeControl from '../components/FontSizeControl.jsx'
import InstallAppCard from '../components/InstallAppCard.jsx'

const Profile = () => {
  const { me, logout } = useContext(ParentContext)
  const { t, lang, setLang, availableLanguages } = useLanguage()

  if (!me) return <div className='px-6 pt-16 text-muted'>{t('loading')}</div>

  return (
    <div className='px-5 pt-10'>
      <p className='font-display text-2xl text-ink mb-6'>{t('profile')}</p>

      <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-4'>
        <div className='w-14 h-14 rounded-full bg-accent-soft text-accent flex items-center justify-center font-display text-xl mb-4'>
          {me.name?.[0]?.toUpperCase()}
        </div>
        <p className='text-ink font-medium text-lg mb-1'>{me.name}</p>
        <p className='text-muted text-sm font-mono'>{me.phone}</p>
      </div>

      <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-4'>
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

      <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-4'>
        <FontSizeControl label={t('textSize')} />
      </div>

      <InstallAppCard />

      <button onClick={logout} className='w-full py-4 rounded-2xl border border-hairline text-muted font-medium mt-3'>
        {t('signOut')}
      </button>
    </div>
  )
}

export default Profile
