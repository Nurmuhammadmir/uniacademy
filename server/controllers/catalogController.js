// read-only reference data - no branch scoping needed
import Language from "../models/Language.js"
import Level from "../models/Level.js"
import Branch from "../models/Branch.js"
import Settings from "../models/Settings.js"

// api to read the global settings (e.g. is passport info required) - any authenticated role can
// read this, only the director can change it (see directorController.updateSettings)
export const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne({})
        if (!settings) settings = await Settings.create({})
        res.json({ settings })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// this reference data is hit by every app, on every load, from every concurrent user - .lean()
// skips building full Mongoose documents for data nobody here mutates or re-saves
export const listLanguages = async (req, res) => {
    try {
        const languages = await Language.find({}).lean()
        res.json({ languages })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listLevels = async (req, res) => {
    try {
        const filter = req.query.languageId ? { languageId: req.query.languageId } : {}
        const levels = await Level.find(filter).sort({ order: 1 }).lean()
        res.json({ levels })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listBranches = async (req, res) => {
    try {
        const branches = await Branch.find({}).lean()
        res.json({ branches })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
