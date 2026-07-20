import express from "express"
import { getPublicLeadForm, submitPublicLeadForm } from "../controllers/publicLeadFormController.js"

// deliberately NOT behind requireRole - these are public lead-intake form links, meant to be
// opened by anyone (prospective students), with no login of their own
const publicRouter = express.Router()

publicRouter.get('/leads-form/:slug', getPublicLeadForm)
publicRouter.post('/leads-form/:slug/submit', submitPublicLeadForm)

export default publicRouter
