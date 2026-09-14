import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Download } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as any).standalone === true

const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

const InstallAppButton = () => {
  const { t } = useLanguage()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone())

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
      toast.success(t('install.success'))
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [t])

  if (installed) return null

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setDeferredPrompt(null)
      return
    }
    toast.info(isIos() ? t('install.iosInstructions') : t('install.genericInstructions'), { autoClose: 6000 })
  }

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-[#0066CC] hover:bg-blue-50 transition-all"
    >
      <Download size={15} />
      <span>{t('install.button')}</span>
    </button>
  )
}

export default InstallAppButton
