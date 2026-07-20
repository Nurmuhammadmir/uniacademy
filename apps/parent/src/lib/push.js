// Web Push needs the VAPID public key as a raw Uint8Array, but env vars/browsers only deal in
// base64url strings - this is the standard conversion every Web Push guide uses.
const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window

// returns the raw PushSubscription (endpoint + keys) ready to send to the backend, or null if the
// user denied permission / the browser doesn't support push at all. Safe to call repeatedly -
// subscribing again on an already-subscribed browser just returns the same existing subscription.
export const subscribeToPush = async () => {
    if (!pushSupported()) return null

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (existing) return existing.toJSON()

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
    return subscription.toJSON()
}

// used to check "is this device already opted in" on page load, without prompting for permission
export const getExistingPushSubscription = async () => {
    if (!pushSupported()) return null
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    return existing ? existing.toJSON() : null
}

export const unsubscribeFromPushLocally = async () => {
    if (!pushSupported()) return null
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (!existing) return null
    const json = existing.toJSON()
    await existing.unsubscribe()
    return json
}
