// RULE #2 — subscription expiry (course-aware)
//
// Homework always belongs to ONE group, and a group teaches ONE specific language+level. So "is
// this student's subscription active" has to mean "is the course entry matching THIS group's
// language+level active" - not some single top-level flag, since a student can study several
// languages at once with completely independent billing per language (see User.courses), and can
// now even be in more than one active group of the SAME language at once - so "the" active group
// is no longer well-defined without an explicit groupId telling us which one this request is about.
import User from "../models/User.js"
import Group from "../models/Group.js"

export const requireActiveSubscription = async (req, res, next) => {
    try {
        const student = await User.findById(req.auth.userId)
        if (!student) return res.status(403).json({ error: 'subscription_expired' })

        const groupId = req.query.groupId || req.body.groupId
        const group = groupId
            ? await Group.findOne({ _id: groupId, studentIds: student._id, status: 'active' })
            : await Group.findOne({ studentIds: student._id, status: 'active' })
        if (!group) return res.status(403).json({ error: 'subscription_expired' })

        const course = student.courses.find(c =>
            String(c.languageId) === String(group.languageId) && String(c.levelId) === String(group.levelId)
        )

        if (!course || !course.isActive || !course.subscriptionExpiresAt || Date.now() > course.subscriptionExpiresAt.getTime()) {
            return res.status(403).json({ error: 'subscription_expired' })
        }

        next()
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
