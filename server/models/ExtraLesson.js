import mongoose from "mongoose"

// a one-off makeup/extra class - deliberately separate from Lesson (which is one occurrence of a
// GROUP's own recurring schedule, unique per groupId+date). An extra lesson exists for specific
// STUDENTS (e.g. someone who missed a regular class), can have its own teacher (a substitute or the
// group's own), and its own date/time that has nothing to do with the group's schedulePattern - so
// it doesn't touch Lesson/lessonGenerator.service.js at all, just references the group for context.
const extraLessonSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

extraLessonSchema.index({ groupId: 1, date: 1 })

const ExtraLesson = mongoose.models.ExtraLesson || mongoose.model('ExtraLesson', extraLessonSchema)
export default ExtraLesson
