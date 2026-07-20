import React, { useContext, useState } from 'react'
import { ParentContext } from '../context/ParentContext.jsx'
import Logo from '../components/Logo.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const Login = () => {
  const { login } = useContext(ParentContext)
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
    <div className='min-h-screen flex flex-col justify-center px-6'>
      <div className='flex justify-between items-start mb-1'>
        <Logo size={80} />
        <select value={lang} onChange={e => setLang(e.target.value)} className='px-2 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-xs text-ink'>
          {availableLanguages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>
      <p className='text-muted mb-8 ml-[50px]'>{t('signInSubtitle')}</p>

      <form onSubmit={onSubmit} className='flex flex-col gap-4'>
        <input type='tel' inputMode='tel' placeholder={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)}
          className='w-full px-4 py-4 rounded-2xl bg-bg-elevated border border-hairline text-ink placeholder:text-muted' required />
        <PasswordInput placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)}
          className='w-full px-4 py-4 rounded-2xl bg-bg-elevated border border-hairline text-ink placeholder:text-muted' required />
        <button type='submit' disabled={loading} className='w-full py-4 rounded-2xl bg-accent text-white font-medium text-base disabled:opacity-60'>
          {loading ? t('signingIn') : t('signIn')}
        </button>
      </form>
    </div>
  )
}

export default Login
