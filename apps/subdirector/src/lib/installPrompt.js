// Captures the browser's "beforeinstallprompt" event as early as possible - it can fire before any
// component mounts, and browsers require prompt() to be called from a later user gesture (a tap on
// the "Install app" button), not automatically. Firefox and iOS Safari never fire this event at
// all; iOS has no programmatic install and needs the manual Share -> Add to Home Screen flow
// instead, which the UI explains rather than trying to trigger.
let deferredPrompt = null
let listeners = []

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  listeners.forEach(fn => fn(true))
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  listeners.forEach(fn => fn(false))
})

export const isInstallAvailable = () => !!deferredPrompt

export const onInstallAvailabilityChange = (fn) => {
  listeners.push(fn)
  return () => { listeners = listeners.filter(f => f !== fn) }
}

export const promptInstall = async () => {
  if (!deferredPrompt) return null
  deferredPrompt.prompt()
  const choice = await deferredPrompt.userChoice
  deferredPrompt = null
  return choice.outcome // 'accepted' | 'dismissed'
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)
