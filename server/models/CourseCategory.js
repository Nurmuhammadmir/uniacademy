import mongoose from "mongoose"

// manageable course tags (Courses page) - director/sub_director can add/rename/delete these, then
// attach any number of them to a course (Language.categoryIds) so admin can filter a long course
// list down by tag. Global like Language/Level themselves (courses aren't branch-scoped), not
// per-branch like ExpenseCategory. Courses reference the tag by ID rather than copying its name, so
// a rename here is instantly reflected everywhere without any cascade rewrite - only a delete needs
// to pull the id out of any Language that had it attached (see deleteCourseCategory).
const courseCategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
}, { timestamps: true })

const CourseCategory = mongoose.models.CourseCategory || mongoose.model('CourseCategory', courseCategorySchema)
export default CourseCategory
