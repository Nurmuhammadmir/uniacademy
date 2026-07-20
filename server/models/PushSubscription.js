import mongoose from "mongoose"

// one browser/device's Web Push subscription for a parent - a parent can have several (phone
// browser + installed PWA + a second device), each stored as its own row so a notification goes
// out to every device they've enabled it on. The endpoint itself is the real per-device identity
// (unique per browser install), not just a convenience key.
const pushSubscriptionSchema = new mongoose.Schema({
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
    },
}, { timestamps: true })

pushSubscriptionSchema.index({ parentId: 1 })

const PushSubscription = mongoose.models.PushSubscription || mongoose.model('PushSubscription', pushSubscriptionSchema)
export default PushSubscription
