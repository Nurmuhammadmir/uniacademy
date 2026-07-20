// single login endpoint shared by all 4 apps - the returned JWT's role decides which app the client routes into
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import User from "../models/User.js"

export const login = async (req, res) => {
    try {
        const { phone, password } = req.body
        if (!phone || !password) return res.status(400).json({ error: 'missing_credentials' })

        const user = await User.findOne({ phone })
        if (!user) return res.status(401).json({ error: 'invalid_credentials' })

        const match = await bcrypt.compare(password, user.passwordHash)
        if (!match) return res.status(401).json({ error: 'invalid_credentials' })

        if (user.role === 'student' && user.status === 'archived') return res.status(403).json({ error: 'account_archived' })

        const token = jwt.sign(
            { userId: user._id, role: user.role, branchId: user.branchId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.json({ token, user: { id: user._id, name: user.name, role: user.role, branchId: user.branchId } })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
