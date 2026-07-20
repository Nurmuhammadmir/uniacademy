// backs the admin "Leads" Kanban board - branch-scoped CRM for prospective students before they
// become real Users. Columns are pipeline stages (e.g. New/Contacted/Trial/Won/Lost), subgroups are
// an optional bucket within a column (e.g. split "New" by which platform a lead came from), leads
// are the actual cards. A locked column can't have cards dragged into or out of it - protects a
// finalized stage (Won/Lost) from being disturbed by an accidental drag.
import crypto from "crypto"
import LeadColumn from "../models/LeadColumn.js"
import LeadSubgroup from "../models/LeadSubgroup.js"
import Lead from "../models/Lead.js"
import LeadSource from "../models/LeadSource.js"
import LeadForm from "../models/LeadForm.js"
import { ensureDefaultLeadSources } from "../services/leadSources.service.js"

// single call backing the whole board - flat arrays, the frontend assembles the tree client-side
export const getLeadsBoard = async (req, res) => {
    try {
        const columns = await LeadColumn.find({ branchId: req.auth.branchId }).sort({ order: 1 })
        const columnIds = columns.map(c => c._id)
        const subgroups = await LeadSubgroup.find({ columnId: { $in: columnIds } }).sort({ order: 1 })
        const leads = await Lead.find({ columnId: { $in: columnIds } }).sort({ order: 1 })
        res.json({ columns, subgroups, leads })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Columns ====

export const createColumn = async (req, res) => {
    try {
        const { name } = req.body
        const maxOrder = await LeadColumn.findOne({ branchId: req.auth.branchId }).sort({ order: -1 })
        const column = await LeadColumn.create({ branchId: req.auth.branchId, name, order: (maxOrder?.order ?? -1) + 1 })
        res.status(201).json({ column })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateColumn = async (req, res) => {
    try {
        const { name, order, locked } = req.body
        const patch = {}
        if (name !== undefined) patch.name = name
        if (order !== undefined) patch.order = order
        if (locked !== undefined) patch.locked = locked
        const column = await LeadColumn.findOneAndUpdate({ _id: req.params.id, branchId: req.auth.branchId }, patch, { new: true })
        if (!column) return res.status(404).json({ error: 'not_found' })
        res.json({ column })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteColumn = async (req, res) => {
    try {
        const column = await LeadColumn.findOneAndDelete({ _id: req.params.id, branchId: req.auth.branchId })
        if (!column) return res.status(404).json({ error: 'not_found' })
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
        const column = await LeadColumn.findOne({ _id: req.params.columnId, branchId: req.auth.branchId })
        if (!column) return res.status(404).json({ error: 'not_found' })
        const { name } = req.body
        const maxOrder = await LeadSubgroup.findOne({ columnId: column._id }).sort({ order: -1 })
        const subgroup = await LeadSubgroup.create({ branchId: req.auth.branchId, columnId: column._id, name, order: (maxOrder?.order ?? -1) + 1 })
        res.status(201).json({ subgroup })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateSubgroup = async (req, res) => {
    try {
        const { name, order, autoIntakeSourceNames } = req.body
        const patch = {}
        if (name !== undefined) patch.name = name
        if (order !== undefined) patch.order = order
        if (autoIntakeSourceNames !== undefined) patch.autoIntakeSourceNames = autoIntakeSourceNames
        const subgroup = await LeadSubgroup.findOneAndUpdate({ _id: req.params.id, branchId: req.auth.branchId }, patch, { new: true })
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
        const subgroup = await LeadSubgroup.findOneAndDelete({ _id: req.params.id, branchId: req.auth.branchId })
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
        await ensureDefaultLeadSources(req.auth.branchId)
        const sources = await LeadSource.find({ branchId: req.auth.branchId }).sort({ name: 1 })
        res.json({ sources })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createLeadSource = async (req, res) => {
    try {
        const { name, color } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        const source = await LeadSource.create({ branchId: req.auth.branchId, name: name.trim(), color: color || '#7A7266' })
        res.status(201).json({ source })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'source_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateLeadSource = async (req, res) => {
    try {
        const { name, color } = req.body
        const source = await LeadSource.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!source) return res.status(404).json({ error: 'not_found' })

        const oldName = source.name
        if (name !== undefined && name.trim()) source.name = name.trim()
        if (color !== undefined) source.color = color
        await source.save()

        // cascade the rename everywhere a source NAME is stored as a plain string, so nothing
        // silently becomes "unknown" just because the label changed
        if (source.name !== oldName) {
            await Lead.updateMany({ branchId: req.auth.branchId, source: oldName }, { source: source.name })
            await LeadForm.updateMany({ branchId: req.auth.branchId, sourceName: oldName }, { sourceName: source.name })
            await LeadSubgroup.updateMany(
                { branchId: req.auth.branchId, autoIntakeSourceNames: oldName },
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
        const source = await LeadSource.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!source) return res.status(404).json({ error: 'not_found' })
        if (source.name === 'Other') return res.status(400).json({ error: 'cannot_delete_other' })

        await ensureDefaultLeadSources(req.auth.branchId)
        await Lead.updateMany({ branchId: req.auth.branchId, source: source.name }, { source: 'Other' })
        await LeadForm.updateMany({ branchId: req.auth.branchId, sourceName: source.name }, { sourceName: 'Other' })
        await LeadSubgroup.updateMany(
            { branchId: req.auth.branchId, autoIntakeSourceNames: source.name },
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
        const { name, phone, source, comment, columnId, subgroupId } = req.body
        const column = await LeadColumn.findOne({ _id: columnId, branchId: req.auth.branchId })
        if (!column) return res.status(400).json({ error: 'invalid_column' })
        if (column.locked) return res.status(400).json({ error: 'column_locked' })

        // if no subgroup was explicitly chosen, fall back to whichever subgroup in this column has
        // this source bound via its auto-intake settings (see LeadSubgroup.autoIntakeSourceNames)
        let resolvedSubgroupId = subgroupId || null
        if (!resolvedSubgroupId && source) {
            const autoSubgroup = await LeadSubgroup.findOne({ columnId, autoIntakeSourceNames: source })
            if (autoSubgroup) resolvedSubgroupId = autoSubgroup._id
        }

        const maxOrder = await Lead.findOne({ columnId, subgroupId: resolvedSubgroupId }).sort({ order: -1 })
        const lead = await Lead.create({
            branchId: req.auth.branchId, columnId, subgroupId: resolvedSubgroupId,
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
        const lead = await Lead.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!lead) return res.status(404).json({ error: 'not_found' })

        const { name, phone, source, comment, columnId, subgroupId, order } = req.body
        const isMoving = columnId !== undefined && String(columnId) !== String(lead.columnId)

        if (isMoving) {
            const [fromColumn, toColumn] = await Promise.all([
                LeadColumn.findOne({ _id: lead.columnId, branchId: req.auth.branchId }),
                LeadColumn.findOne({ _id: columnId, branchId: req.auth.branchId }),
            ])
            if (!toColumn) return res.status(400).json({ error: 'invalid_column' })
            if (fromColumn?.locked || toColumn.locked) return res.status(400).json({ error: 'column_locked' })
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

export const deleteLead = async (req, res) => {
    try {
        await Lead.findOneAndDelete({ _id: req.params.id, branchId: req.auth.branchId })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Lead intake forms ====

export const listLeadForms = async (req, res) => {
    try {
        const forms = await LeadForm.find({ branchId: req.auth.branchId }).sort({ createdAt: -1 })
        res.json({ forms })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getLeadForm = async (req, res) => {
    try {
        const form = await LeadForm.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!form) return res.status(404).json({ error: 'not_found' })
        res.json({ form })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createLeadForm = async (req, res) => {
    try {
        const { name, columnId, subgroupId, sourceName, fields } = req.body
        const column = await LeadColumn.findOne({ _id: columnId, branchId: req.auth.branchId })
        if (!column) return res.status(400).json({ error: 'invalid_column' })

        const form = await LeadForm.create({
            branchId: req.auth.branchId, name: name || '', columnId, subgroupId: subgroupId || null,
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
        const { name, columnId, subgroupId, sourceName, fields } = req.body
        const patch = {}
        if (name !== undefined) patch.name = name
        if (columnId !== undefined) patch.columnId = columnId
        if (subgroupId !== undefined) patch.subgroupId = subgroupId || null
        if (sourceName !== undefined) patch.sourceName = sourceName
        if (fields !== undefined) patch.fields = fields

        const form = await LeadForm.findOneAndUpdate({ _id: req.params.id, branchId: req.auth.branchId }, patch, { new: true })
        if (!form) return res.status(404).json({ error: 'not_found' })
        res.json({ form })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteLeadForm = async (req, res) => {
    try {
        await LeadForm.findOneAndDelete({ _id: req.params.id, branchId: req.auth.branchId })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
