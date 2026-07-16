import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { isInstallAvailable, onInstallAvailabilityChange, promptInstall, isStandalone, isIOS } from '../lib/installPrompt.js'

// lets a student add this app to their phone's home screen with one tap, instead of hunting
// through the browser menu themselves. Chrome/Edge/Android support a real native install prompt;
// iOS Safari has no such API at all, so it gets step-by-step Share -> Add to Home Screen instructions.
const InstallAppCard = ({ t }) => {
  const [available, setAvailable] = useState(isInstallAvailable())
  const [installing, setInstalling] = useState(false)

  useEffect(() => onInstallAvailabilityChange(setAvailable), [])

  if (isStandalone()) return null // already running as an installed app - nothing to offer

  const install = async () => {
    setInstalling(true)
    const outcome = await promptInstall()
    setInstalling(false)
    if (outcome === 'accepted') toast.success(t('appInstalled'))
  }

  return (
    <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-4'>
      <p className='text-ink font-medium mb-1'>{t('installApp')}</p>
      {available ? (
        <>
          <p className='text-muted text-sm mb-3'>{t('installAppDesc')}</p>
          <button onClick={install} disabled={installing}
            className='w-full py-3 rounded-xl bg-accent text-white font-medium disabled:opacity-50'>
            {installing ? t('installing') : t('installNow')}
          </button>
        </>
      ) : isIOS() ? (
        <p className='text-muted text-sm'>{t('iosInstallHint')}</p>
      ) : (
        <p className='text-muted text-sm'>{t('installUnavailableHint')}</p>
      )}
    </div>
  )
}

export default InstallAppCard
