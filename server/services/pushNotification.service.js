import webpush from "web-push"
import PushSubscription from "../models/PushSubscription.js"

// VAPID keys identify THIS server to push services (Google/Mozilla/Apple's push gateways) - not
// secret to browsers, but must stay stable forever (see .env's own comment on why). Configuring
// this at import time (once, when the module is first loaded) rather than per-call.
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@uniacademy.app',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
    )
}

// sends one push payload to every device a parent has subscribed on - a dead/expired subscription
// (410 Gone, or 404 if the browser forgot it) is deleted right away so it stops being retried
// forever; any other failure is logged but doesn't stop the rest of that parent's devices from
// getting the notification.
export const sendPushToParent = async (parentId, payload) => {
    const subs = await PushSubscription.find({ parentId })
    for (const sub of subs) {
        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                JSON.stringify(payload),
            )
        } catch (error) {
            if (error.statusCode === 410 || error.statusCode === 404) {
                await PushSubscription.findByIdAndDelete(sub._id)
            } else {
                console.log('push send failed', error.statusCode, error.body)
            }
        }
    }
}
