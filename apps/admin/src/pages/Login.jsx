import React, { useContext, useState } from 'react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Logo from '../components/Logo.jsx'
import PasswordInput from '../components/PasswordInput.jsx'

const Login = () => {
  const { login } = useContext(AdminContext)
  const { t, lang, setLang, availableLanguages } = useLanguage()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await login(phone, password)
    setLoading(false)
  }

  return (
    <div className='min-h-screen flex items-center justify-center'>
      <form onSubmit={onSubmit} className='w-full max-w-sm bg-bg-elevated border border-hairline rounded-2xl p-8'>
        <div className='flex justify-between items-start mb-1'>
          <Logo size={60} />
          <select value={lang} onChange={e => setLang(e.target.value)} className='px-2 py-1.5 rounded-lg bg-bg border border-hairline text-xs text-ink'>
            {availableLanguages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <p className='text-muted mb-6 ml-10'>{t('frontDeskConsole')}</p>
        <input type='tel' placeholder={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)}
          className='w-full px-4 py-3 rounded-xl bg-bg border border-hairline text-ink placeholder:text-muted mb-3' required />
        <PasswordInput placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)}
          className='w-full px-4 py-3 rounded-xl bg-bg border border-hairline text-ink placeholder:text-muted mb-4' required />
        <button type='submit' disabled={loading} className='w-full py-3 rounded-xl bg-accent text-white font-medium disabled:opacity-60'>
          {loading ? t('signingIn') : t('signIn')}
        </button>
      </form>
    </div>
  )
}

export default Login
