import React, { useEffect, useState } from 'react'
import { registerConfirmListener } from '../lib/confirm.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'

// mounted once near the app root - listens for confirm() calls from anywhere (contexts included)
// and renders a real modal instead of window.confirm()
const ConfirmHost = () => {
  const [request, setRequest] = useState(null)
  const { t } = useLanguage()

  useEffect(() => {
    registerConfirmListener((req) => setRequest(req))
  }, [])

  if (!request) return null

  const handle = (result) => {
    request.resolve(result)
    setRequest(null)
  }

  return (
    <div className='fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-4'>
      <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 w-full max-w-sm'>
        <p className='text-ink font-medium mb-2'>{t('areYouSure')}</p>
        <p className='text-muted text-sm mb-5'>{request.message}</p>
        <div className='flex gap-3'>
          <button onClick={() => handle(false)} className='flex-1 py-3 rounded-xl border border-hairline text-muted font-medium'>{t('cancel')}</button>
          <button onClick={() => handle(true)} className='flex-1 py-3 rounded-xl bg-accent dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-white font-medium'>{t('confirm')}</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmHost
