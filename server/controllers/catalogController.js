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

export const listLanguages = async (req, res) => {
    try {
        const languages = await Language.find({})
        res.json({ languages })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listLevels = async (req, res) => {
    try {
        const filter = req.query.languageId ? { languageId: req.query.languageId } : {}
        const levels = await Level.find(filter).sort({ order: 1 })
        res.json({ levels })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listBranches = async (req, res) => {
    try {
        const branches = await Branch.find({})
        res.json({ branches })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
