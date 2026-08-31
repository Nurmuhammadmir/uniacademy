import React, { useContext, useState } from 'react'
import { Menu } from '@headlessui/react'
import { Globe } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Logo from '../components/Logo.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import Spinner from '../components/Spinner.jsx'

const LABEL = 'text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5 block'
const FIELD = 'w-full py-2.5 px-4 rounded-lg border border-slate-200 bg-slate-50/50 text-[#1D1D1F] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all dark:bg-[#1E293B] dark:border-none dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:bg-[#1E293B]'

const LanguageSwitcher = ({ lang, setLang, availableLanguages }) => (
  <Menu as='div' className='relative'>
    <Menu.Button className='plain h-9 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-medium flex items-center gap-1.5 shadow-sm hover:bg-slate-50 transition-colors dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 dark:border-none'>
      <Globe size={14} strokeWidth={1.5} /> {lang.toUpperCase()}
    </Menu.Button>
    <Menu.Items anchor='bottom end' transition
      className='w-36 rounded-xl bg-white border border-slate-100 shadow-lg shadow-slate-200/50 p-1.5 [--anchor-gap:6px] focus:outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-[#161F30] dark:border-slate-800/80 dark:shadow-black/40'>
      {availableLanguages.map(l => (
        <Menu.Item key={l.code}>
          {({ active }) => (
            <button type='button' onClick={() => setLang(l.code)}
              className={`plain w-full text-left px-3 py-2 text-sm rounded-lg ${l.code === lang ? 'bg-blue-50 text-blue-700 font-medium dark:bg-[#1E1B4B] dark:text-[#818CF8]' : 'text-slate-700 dark:text-slate-300'} ${active && l.code !== lang ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}>
              {l.label}
            </button>
          )}
        </Menu.Item>
      ))}
    </Menu.Items>
  </Menu>
)

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
    <div className='min-h-screen flex items-center justify-center relative bg-bg'>
      {/* right-20, not right-6 - clears the persistent theme toggle (App.jsx's GlobalThemeToggle,
          fixed at top-4 right-6) so the two controls don't sit on top of each other */}
      <div className='absolute top-6 right-20 z-10'>
        <LanguageSwitcher lang={lang} setLang={setLang} availableLanguages={availableLanguages} />
      </div>

      <form onSubmit={onSubmit} className='max-w-md w-full bg-white dark:bg-[#161F30] rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/40 border border-slate-100 dark:border-slate-800/80 p-8 md:p-10'>
        <div className='flex flex-col items-center text-center mb-6'>
          <Logo size={64} withWordmark={false} />
          <p className='text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] mt-4'>{t('loginHeading')}</p>
          <p className='text-sm text-slate-500 dark:text-[#94A3B8] mt-1.5'>{t('frontDeskConsole')}</p>
        </div>

        <label className={LABEL}>{t('phone')}</label>
        <input type='tel' placeholder='+998 (__) ___-__-__' value={phone} onChange={(e) => setPhone(e.target.value)} className={`${FIELD} mb-4`} required />

        <label className={LABEL}>{t('password')}</label>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} className={`${FIELD} mb-6`} required />

        <button type='submit' disabled={loading}
          className='w-full py-3 bg-accent dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-white font-medium rounded-lg transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent flex items-center justify-center gap-2'>
          {loading && <Spinner size={14} />} {loading ? t('signingIn') : t('signIn')}
        </button>
      </form>
    </div>
  )
}

export default Login
