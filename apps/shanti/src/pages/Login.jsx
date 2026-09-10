import React, { useContext, useState } from 'react'
import { ShantiContext } from '../context/ShantiContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import Spinner from '../components/Spinner.jsx'

const LABEL = 'text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block'
const FIELD = 'w-full py-2.5 px-4 rounded-lg border border-slate-200 bg-slate-50/50 text-[#1D1D1F] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all'

const Login = () => {
  const { login } = useContext(ShantiContext)
  const { t, lang, setLang } = useLanguage()
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
    <div className='min-h-screen flex items-center justify-center relative bg-bg'>
      <div className='absolute top-6 right-6 flex bg-slate-100 rounded-lg p-0.5'>
        {['ru', 'uz'].map(code => (
          <button key={code} onClick={() => setLang(code)}
            className={`plain px-2.5 py-1 rounded-md text-xs font-semibold uppercase transition-colors ${lang === code ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}>
            {code}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className='max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10'>
        <div className='flex flex-col items-center text-center mb-6'>
          <p className='font-logo text-5xl text-[#DC2626]'>Lamussa</p>
          <p className='text-sm text-slate-500 mt-1.5'>{t('loginTitle')}</p>
        </div>

        <label className={LABEL}>{t('phoneLabel')}</label>
        <input type='tel' placeholder='+998 (__) ___-__-__' value={phone} onChange={(e) => setPhone(e.target.value)} className={`${FIELD} mb-4`} required />

        <label className={LABEL}>{t('passwordLabel')}</label>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} className={`${FIELD} mb-6`} required />

        <button type='submit' disabled={loading}
          className='w-full py-3 bg-accent text-white font-medium rounded-lg transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent flex items-center justify-center gap-2'>
          {loading && <Spinner size={14} />} {loading ? t('signingInBtn') : t('signInBtn')}
        </button>
      </form>
    </div>
  )
}

export default Login
