import mongoose from "mongoose"

// dated, multi-entry comments left on a STUDENT - separate from the flat student.notes field
// (User.js), same idea as GroupComment.js but for one student instead of a whole class. Unlike
// GroupComment, this one is editable (editedAt tracks whether it's been changed since posting).
const studentCommentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    editedAt: { type: Date, default: null },
}, { timestamps: true })

studentCommentSchema.index({ studentId: 1, createdAt: -1 })

const StudentComment = mongoose.models.StudentComment || mongoose.model('StudentComment', studentCommentSchema)
export default StudentComment
