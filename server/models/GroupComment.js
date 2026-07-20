import mongoose from "mongoose"

// free-text notes staff leave on a group (the "Izohlar" tab on the Group Details page) - separate
// from a student's own notes field, this is about the CLASS as a whole
const groupCommentSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
}, { timestamps: true })

groupCommentSchema.index({ groupId: 1, createdAt: -1 })

const GroupComment = mongoose.models.GroupComment || mongoose.model('GroupComment', groupCommentSchema)
export default GroupComment
