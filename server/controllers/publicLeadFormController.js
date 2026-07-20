// PUBLIC, unauthenticated endpoints - anyone with a form's link can view its fields and submit a
// lead. No req.auth here at all; every lookup is scoped by the form's own slug, never a branchId
// the caller could supply themselves.
import LeadForm from "../models/LeadForm.js"
import LeadColumn from "../models/LeadColumn.js"
import LeadSubgroup from "../models/LeadSubgroup.js"
import Lead from "../models/Lead.js"

// only exposes what a public submitter needs to render the form - never the branchId/column/etc
export const getPublicLeadForm = async (req, res) => {
    try {
        const form = await LeadForm.findOne({ slug: req.params.slug })
        if (!form) return res.status(404).json({ error: 'not_found' })
        res.json({ form: { name: form.name, fields: form.fields } })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// 'name'/'phone'/'comment' field keys map onto the Lead's own top-level fields; any other key
// (e.g. "Kursingizni tanlang") is stored under Lead.answers instead. Always lands in the form's own
// column/subgroup and is tagged with the form's own source - the same auto-intake-by-source lookup
// createLead uses doesn't apply here since the form already has an explicit target.
export const submitPublicLeadForm = async (req, res) => {
    try {
        const form = await LeadForm.findOne({ slug: req.params.slug })
        if (!form) return res.status(404).json({ error: 'not_found' })

        const column = await LeadColumn.findById(form.columnId)
        if (!column) return res.status(400).json({ error: 'form_misconfigured' })

        const answers = { ...(req.body.answers || {}) }
        const name = req.body.name || ''
        const phone = req.body.phone || ''
        const comment = req.body.comment || ''

        for (const field of form.fields) {
            if (field.required && !['name', 'phone', 'comment'].includes(field.key) && !answers[field.key]) {
                return res.status(400).json({ error: 'missing_required_field', field: field.key })
            }
        }

        let subgroupId = form.subgroupId
        if (!subgroupId) {
            const autoSubgroup = await LeadSubgroup.findOne({ columnId: form.columnId, autoIntakeSourceNames: form.sourceName })
            if (autoSubgroup) subgroupId = autoSubgroup._id
        }

        const maxOrder = await Lead.findOne({ columnId: form.columnId, subgroupId: subgroupId || null }).sort({ order: -1 })
        await Lead.create({
            branchId: form.branchId, columnId: form.columnId, subgroupId: subgroupId || null,
            name, phone, comment, source: form.sourceName, formId: form._id, answers,
            order: (maxOrder?.order ?? -1) + 1,
        })
        res.status(201).json({ submitted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
