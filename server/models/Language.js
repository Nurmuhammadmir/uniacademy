import mongoose from "mongoose"
const languageSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    // director-managed tags (see CourseCategory) - a course can carry any number of them, purely to
    // narrow down the course picker once a branch runs dozens of courses. A course with no tags still
    // works everywhere, it just doesn't get grouped in the picker.
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CourseCategory', default: [] }],
}, { timestamps: true })
const Language = mongoose.models.Language || mongoose.model('Language', languageSchema)
export default Language
