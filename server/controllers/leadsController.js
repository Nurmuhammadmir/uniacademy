// backs the admin "Leads" Kanban board - branch-scoped CRM for prospective students before they
// become real Users. Columns are pipeline stages (e.g. New/Contacted/Trial/Won/Lost), subgroups are
// an optional bucket within a column (e.g. split "New" by which platform a lead came from), leads
// are the actual cards. A locked column can't have cards dragged into or out of it - protects a
// finalized stage (Won/Lost) from being disturbed by an accidental drag.
//
// Shared by both adminRoute.js (an admin always has req.auth.branchId from their own JWT) and
// directorRoute.js (a director/sub_director has no home branch - they pass whichever branch they're
// currently viewing as ?branchId=/body.branchId, same pattern getFinanceOverview already uses). This
// is the ONE controller both roles hit - never a second, branch-selection-flavored copy that could
// drift out of sync with this one.
import crypto from "crypto"
import LeadColumn from "../models/LeadColumn.js"
import LeadSubgroup from "../models/LeadSubgroup.js"
import Lead from "../models/Lead.js"
import LeadSource from "../models/LeadSource.js"
import LeadForm from "../models/LeadForm.js"
import { ensureDefaultLeadSources } from "../services/leadSources.service.js"

const resolveBranchId = (req) => req.auth.branchId || req.query.branchId || req.body.branchId

// single call backing the whole board - flat arrays, the frontend assembles the tree client-side
export const getLeadsBoard = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const columns = await LeadColumn.find({ branchId }).sort({ order: 1 }).lean()
        const columnIds = columns.map(c => c._id)
        const subgroups = await LeadSubgroup.find({ columnId: { $in: columnIds } }).sort({ order: 1 }).lean()
        const leads = await Lead.find({ columnId: { $in: columnIds } }).sort({ order: 1 }).lean()
        res.json({ columns, subgroups, leads })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Columns ====

export const createColumn = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const { name } = req.body
        const maxOrder = await LeadColumn.findOne({ branchId }).sort({ order: -1 }).lean()
        const column = await LeadColumn.create({ branchId, name, order: (maxOrder?.order ?? -1) + 1 })
        res.status(201).json({ column })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateColumn = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const { name, order, locked } = req.body
        const patch = {}
        if (name !== undefined) patch.name = name
        if (order !== undefined) patch.order = order
        if (locked !== undefined) patch.locked = locked
        const column = await LeadColumn.findOneAndUpdate({ _id: req.params.id, branchId }, patch, { new: true })
        if (!column) return res.status(404).json({ error: 'not_found' })
        res.json({ column })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteColumn = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const column = await LeadColumn.findOne({ _id: req.params.id, branchId }).lean()
        if (!column) return res.status(404).json({ error: 'not_found' })

        // confirmed real gap: admin can never delete a lead directly (no DELETE /leads/:id route is
        // even mounted for admin), but deleting the COLUMN a lead sits in used to destroy it anyway,
        // unconditionally, for anyone - a backdoor around a rule that's otherwise enforced by simply
        // not exposing the endpoint. Only director/sub_director (who already have real per-lead
        // delete rights, see deleteLead below) may still remove a column that still has leads in it -
        // admin has to move every lead out first (e.g. the board's own bulk-move) before the column
        // itself can go.
        if (req.auth.role === 'admin') {
            const leadCount = await Lead.countDocuments({ columnId: column._id })
            if (leadCount > 0) return res.status(400).json({ error: 'column_has_leads' })
        }

        await LeadColumn.deleteOne({ _id: column._id })
        await LeadSubgroup.deleteMany({ columnId: column._id })
        await Lead.deleteMany({ columnId: column._id })
        await LeadForm.deleteMany({ columnId: column._id })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Subgroups ====

export const createSubgroup = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const column = await LeadColumn.findOne({ _id: req.params.columnId, branchId }).lean()
        if (!column) return res.status(404).json({ error: 'not_found' })
        const { name } = req.body
        const maxOrder = await LeadSubgroup.findOne({ columnId: column._id }).sort({ order: -1 }).lean()
        const subgroup = await LeadSubgroup.create({ branchId, columnId: column._id, name, order: (maxOrder?.order ?? -1) + 1 })
        res.status(201).json({ subgroup })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateSubgroup = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const { name, order, autoIntakeSourceNames } = req.body
        const patch = {}
        if (name !== undefined) patch.name = name
        if (order !== undefined) patch.order = order
        if (autoIntakeSourceNames !== undefined) patch.autoIntakeSourceNames = autoIntakeSourceNames
        const subgroup = await LeadSubgroup.findOneAndUpdate({ _id: req.params.id, branchId }, patch, { new: true })
        if (!subgroup) return res.status(404).json({ error: 'not_found' })
        res.json({ subgroup })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// deletes the bucket but keeps the leads inside it - a lead is a real contact, losing the bucket
// label shouldn't destroy its data. Leads just fall back to "no subgroup" within the same column.
export const deleteSubgroup = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const subgroup = await LeadSubgroup.findOneAndDelete({ _id: req.params.id, branchId })
        if (!subgroup) return res.status(404).json({ error: 'not_found' })
        await Lead.updateMany({ subgroupId: subgroup._id }, { subgroupId: null })
        await LeadForm.updateMany({ subgroupId: subgroup._id }, { subgroupId: null })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Sources ====

export const listLeadSources = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        await ensureDefaultLeadSources(branchId)
        const sources = await LeadSource.find({ branchId }).sort({ name: 1 }).lean()
        res.json({ sources })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createLeadSource = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const { name, color } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        const source = await LeadSource.create({ branchId, name: name.trim(), color: color || '#7A7266' })
        res.status(201).json({ source })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'source_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateLeadSource = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const { name, color } = req.body
        const source = await LeadSource.findOne({ _id: req.params.id, branchId })
        if (!source) return res.status(404).json({ error: 'not_found' })

        const oldName = source.name
        if (name !== undefined && name.trim()) source.name = name.trim()
        if (color !== undefined) source.color = color
        await source.save()

        // cascade the rename everywhere a source NAME is stored as a plain string, so nothing
        // silently becomes "unknown" just because the label changed
        if (source.name !== oldName) {
            await Lead.updateMany({ branchId, source: oldName }, { source: source.name })
            await LeadForm.updateMany({ branchId, sourceName: oldName }, { sourceName: source.name })
            await LeadSubgroup.updateMany(
                { branchId, autoIntakeSourceNames: oldName },
                { $set: { 'autoIntakeSourceNames.$': source.name } }
            )
        }
        res.json({ source })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'source_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteLeadSource = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const source = await LeadSource.findOne({ _id: req.params.id, branchId })
        if (!source) return res.status(404).json({ error: 'not_found' })
        if (source.name === 'Other') return res.status(400).json({ error: 'cannot_delete_other' })

        await ensureDefaultLeadSources(branchId)
        await Lead.updateMany({ branchId, source: source.name }, { source: 'Other' })
        await LeadForm.updateMany({ branchId, sourceName: source.name }, { sourceName: 'Other' })
        await LeadSubgroup.updateMany(
            { branchId, autoIntakeSourceNames: source.name },
            { $pull: { autoIntakeSourceNames: source.name } }
        )
        await source.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Leads ====

export const createLead = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const { name, phone, source, comment, columnId, subgroupId } = req.body
        const column = await LeadColumn.findOne({ _id: columnId, branchId }).lean()
        if (!column) return res.status(400).json({ error: 'invalid_column' })
        if (column.locked) return res.status(400).json({ error: 'column_locked' })

        // if no subgroup was explicitly chosen, fall back to whichever subgroup in this column has
        // this source bound via its auto-intake settings (see LeadSubgroup.autoIntakeSourceNames)
        let resolvedSubgroupId = subgroupId || null
        if (!resolvedSubgroupId && source) {
            const autoSubgroup = await LeadSubgroup.findOne({ columnId, autoIntakeSourceNames: source }).lean()
            if (autoSubgroup) resolvedSubgroupId = autoSubgroup._id
        }

        const maxOrder = await Lead.findOne({ columnId, subgroupId: resolvedSubgroupId }).sort({ order: -1 }).lean()
        const lead = await Lead.create({
            branchId, columnId, subgroupId: resolvedSubgroupId,
            name, phone, source: source || 'Other', comment: comment || '',
            order: (maxOrder?.order ?? -1) + 1,
        })
        res.status(201).json({ lead })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// handles both inline-edit saves (name/phone/source/comment) and drag-and-drop moves
// (columnId/subgroupId/order) through the same endpoint - a move is just a partial update
export const updateLead = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const lead = await Lead.findOne({ _id: req.params.id, branchId })
        if (!lead) return res.status(404).json({ error: 'not_found' })

        const { name, phone, source, comment, columnId, subgroupId, order } = req.body
        const isMoving = columnId !== undefined && String(columnId) !== String(lead.columnId)

        if (isMoving) {
            // lock only restricts creating/editing leads directly IN a column (see createLead) - it
            // never blocks moving an existing lead into/out of one by drag-and-drop
            const toColumn = await LeadColumn.findOne({ _id: columnId, branchId }).lean()
            if (!toColumn) return res.status(400).json({ error: 'invalid_column' })
            lead.columnId = columnId
        }

        if (name !== undefined) lead.name = name
        if (phone !== undefined) lead.phone = phone
        if (source !== undefined) lead.source = source
        if (comment !== undefined) lead.comment = comment
        if (subgroupId !== undefined) lead.subgroupId = subgroupId || null
        if (order !== undefined) lead.order = order

        await lead.save()
        res.json({ lead })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// moves every lead in leadIds into one target column/subgroup in a single request - backs the
// board's bulk-select ("select a whole column/subgroup, move them all") instead of one PUT per
// lead. Silently skips any id that isn't actually one of this branch's own leads (no error, no
// partial-failure reporting needed - the response's movedCount already tells the caller how many
// really moved).
export const bulkMoveLeads = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const { leadIds, columnId, subgroupId } = req.body
        if (!Array.isArray(leadIds) || leadIds.length === 0) return res.status(400).json({ error: 'lead_ids_required' })
        const toColumn = await LeadColumn.findOne({ _id: columnId, branchId }).lean()
        if (!toColumn) return res.status(400).json({ error: 'invalid_column' })
        if (subgroupId) {
            const toSubgroup = await LeadSubgroup.findOne({ _id: subgroupId, columnId, branchId }).lean()
            if (!toSubgroup) return res.status(400).json({ error: 'invalid_subgroup' })
        }

        // append after whatever's already in the target bucket, in the order they were selected -
        // matches how a normal drag-to-end-of-column already orders things. Plain per-document
        // updateOne calls (not an aggregation-pipeline updateMany) so Mongoose's own schema casting
        // applies normally to columnId/subgroupId - a bulk selection is realistically tens of leads,
        // not thousands, so N parallel updates costs nothing noticeable here.
        const existingCount = await Lead.countDocuments({ branchId, columnId, subgroupId: subgroupId || null })
        const results = await Promise.all(leadIds.map((leadId, i) =>
            Lead.updateOne(
                { _id: leadId, branchId },
                { columnId, subgroupId: subgroupId || null, order: existingCount + i },
            )
        ))
        const movedCount = results.reduce((sum, r) => sum + r.modifiedCount, 0)
        res.json({ movedCount })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// confirmed spec: admin can never permanently delete a lead - no DELETE route is mounted on
// adminRoute.js at all. A director/sub_director CAN (confirmed spec: director needs full management
// including cleanup) - directorRoute.js is the only place this function is ever mounted.
export const deleteLead = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const lead = await Lead.findOneAndDelete({ _id: req.params.id, branchId })
        if (!lead) return res.status(404).json({ error: 'not_found' })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Lead intake forms ====

export const listLeadForms = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const forms = await LeadForm.find({ branchId }).sort({ createdAt: -1 }).lean()
        res.json({ forms })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getLeadForm = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const form = await LeadForm.findOne({ _id: req.params.id, branchId }).lean()
        if (!form) return res.status(404).json({ error: 'not_found' })
        res.json({ form })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createLeadForm = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const { name, columnId, subgroupId, sourceName, fields } = req.body
        const column = await LeadColumn.findOne({ _id: columnId, branchId }).lean()
        if (!column) return res.status(400).json({ error: 'invalid_column' })

        const form = await LeadForm.create({
            branchId, name: name || '', columnId, subgroupId: subgroupId || null,
            sourceName: sourceName || 'Other',
            ...(fields ? { fields } : {}),
            slug: crypto.randomBytes(9).toString('base64url'),
        })
        res.status(201).json({ form })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateLeadForm = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const { name, columnId, subgroupId, sourceName, fields } = req.body
        const patch = {}
        if (name !== undefined) patch.name = name
        if (columnId !== undefined) patch.columnId = columnId
        if (subgroupId !== undefined) patch.subgroupId = subgroupId || null
        if (sourceName !== undefined) patch.sourceName = sourceName
        if (fields !== undefined) patch.fields = fields

        const form = await LeadForm.findOneAndUpdate({ _id: req.params.id, branchId }, patch, { new: true })
        if (!form) return res.status(404).json({ error: 'not_found' })
        res.json({ form })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteLeadForm = async (req, res) => {
    try {
        const branchId = resolveBranchId(req)
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        await LeadForm.findOneAndDelete({ _id: req.params.id, branchId })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
