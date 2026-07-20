// entrypoint - boots mongo, applies CORS whitelist for all 4 frontends, mounts one router per role
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import connectDB from './config/mongodb.js'
import authRouter from './routes/authRoute.js'
import directorRouter from './routes/directorRoute.js'
import adminRouter from './routes/adminRoute.js'
import teacherRouter from './routes/teacherRoute.js'
import studentRouter from './routes/studentRoute.js'
import parentRouter from './routes/parentRoute.js'
import publicRouter from './routes/publicRoute.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const port = process.env.PORT || 4000
connectDB()

// gzips every JSON/text response - on a cheap, memory-constrained VPS serving hundreds of
// students, this trades a little CPU for a lot less bandwidth and faster responses on slow
// connections, which is the more scarce resource here
app.use(compression())

// raised from Express's 100kb default - a director bulk-pasting a large word/grammar/reading
// bank (hundreds of entries) as one JSON request can comfortably exceed 100kb
app.use(express.json({ limit: '15mb' }))

// Parse the comma-separated client origins from environment variables
const allowedOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin !== '');

app.use(cors({
    origin: (origin, callback) => {
        // Logs incoming requests to Render console so you can see exactly what is being evaluated
        console.log("Incoming Origin:", origin);
        console.log("Allowed Origins List:", allowedOrigins);

        // Allow requests with no origin (like mobile apps, Postman, or server-to-server requests)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        console.warn(`Blocked by CORS: ${origin}`);
        callback(new Error('not_allowed_by_cors'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// serves everything in /server/public at /static - this is where vocab/reading concept images
// actually live on disk (see public/images/concepts/README.md). A Concept's `image` field should
// be set to a path like /static/images/concepts/apple.png, which the frontends load directly as
// an <img src>. maxAge lets browsers cache these for a week instead of re-fetching the same
// vocab/reading photo on every homework load - these files basically never change once uploaded.
app.use('/static', express.static(path.join(__dirname, 'public'), { maxAge: '7d' }))

app.use('/api/auth', authRouter)
app.use('/api/director', directorRouter)
app.use('/api/admin', adminRouter)
app.use('/api/teacher', teacherRouter)
app.use('/api/student', studentRouter)
app.use('/api/parent', parentRouter)
app.use('/api/public', publicRouter)

app.get('/', (req, res) => res.send('uniacademy api working'))

app.listen(port, () => console.log('server started on port', port))