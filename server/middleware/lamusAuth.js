// Lamus's own JWT auth, kept on a dedicated LAMUS_JWT_SECRET rather than reusing this platform's
// JWT_SECRET - both systems put a bare `role` (e.g. 'admin') in the token payload, so sharing one
// secret would let a UniAcademy-issued token be replayed against Lamus's admin check (and vice
// versa). A distinct secret makes that structurally impossible regardless of role-name overlap.
import jwt from 'jsonwebtoken'

export const lamusAuthAdmin = async (req, res, next) => {
  try {
    const { token } = req.headers
    if (!token) return res.json({ success: false, message: 'Not authorized' })
    const decoded = jwt.verify(token, process.env.LAMUS_JWT_SECRET)
    if (decoded.role !== 'admin') return res.json({ success: false, message: 'Admin access required' })
    req.userId = decoded.id
    next()
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}

export const lamusAuthManager = async (req, res, next) => {
  try {
    const { token } = req.headers
    if (!token) return res.json({ success: false, message: 'Not authorized' })
    const decoded = jwt.verify(token, process.env.LAMUS_JWT_SECRET)
    req.userId = decoded.id
    req.userRole = decoded.role
    next()
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}
