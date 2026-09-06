// LasummaShanti's own login - completely separate from the school's /api/auth/login (a different
// collection, ShantiUser, never the school's User). Same JWT_SECRET/shape convention as the school's
// authController.login, just with no branchId claim - nothing downstream needs one.
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import ShantiUser from "../models/ShantiUser.js"

export const login = async (req, res) => {
    try {
        const { phone, password } = req.body
        if (!phone || !password) return res.status(400).json({ error: 'missing_credentials' })

        const user = await ShantiUser.findOne({ phone }).lean()
        if (!user) return res.status(401).json({ error: 'invalid_credentials' })

        const match = await bcrypt.compare(password, user.passwordHash)
        if (!match) return res.status(401).json({ error: 'invalid_credentials' })

        const token = jwt.sign({ userId: user._id, role: 'shanti' }, process.env.JWT_SECRET, { expiresIn: '7d' })
        res.json({ token, user: { id: user._id, name: user.name, role: 'shanti' } })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
