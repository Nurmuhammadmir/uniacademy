// verifies the JWT and enforces role + branch scoping on every protected route
import jwt from "jsonwebtoken"

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            const authHeader = req.headers.authorization
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'not_authenticated' })
            }
            const token = authHeader.split(' ')[1]
            const decoded = jwt.verify(token, process.env.JWT_SECRET)

            if (!allowedRoles.includes(decoded.role)) {
                return res.status(403).json({ error: 'insufficient_role' })
            }

            req.auth = decoded

            if (decoded.role !== 'director') {
                const requestedBranchId = req.params.branchId || req.body.branchId || req.query.branchId
                if (requestedBranchId && String(requestedBranchId) !== String(decoded.branchId)) {
                    return res.status(403).json({ error: 'branch_scope_violation' })
                }
            }

            next()
        } catch (error) {
            console.log(error)
            return res.status(401).json({ error: 'invalid_token' })
        }
    }
}

export default requireRole
