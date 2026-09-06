import express from "express"
import { login } from "../controllers/shantiAuthController.js"
const shantiAuthRouter = express.Router()
shantiAuthRouter.post('/login', login)
export default shantiAuthRouter
