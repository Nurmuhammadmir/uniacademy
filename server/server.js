// entrypoint - boots mongo, applies CORS whitelist for all 4 frontends, mounts one router per role
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import connectDB from './config/mongodb.js'
import authRouter from './routes/authRoute.js'
import directorRouter from './routes/directorRoute.js'
import adminRouter from './routes/adminRoute.js'
import teacherRouter from './routes/teacherRoute.js'
import studentRouter from './routes/studentRoute.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const port = process.env.PORT || 4000
connectDB()

app.use(express.json())

const allowedOrigins = (process.env.CLIENT_ORIGINS || '').split(',').map(origin => origin.trim())
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
        callback(new Error('not_allowed_by_cors'))
    },
}))

// serves everything in /server/public at /static - this is where vocab/reading concept images
// actually live on disk (see public/images/concepts/README.md). A Concept's `image` field should
// be set to a path like /static/images/concepts/apple.png, which the frontends load directly as
// an <img src>.
app.use('/static', express.static(path.join(__dirname, 'public')))

app.use('/api/auth', authRouter)
app.use('/api/director', directorRouter)
app.use('/api/admin', adminRouter)
app.use('/api/teacher', teacherRouter)
app.use('/api/student', studentRouter)

app.get('/', (req, res) => res.send('uniacademy api working'))

app.listen(port, () => console.log('server started', port))
