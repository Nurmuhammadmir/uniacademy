// One-off script to bootstrap LamusWater's first admin (+ a throwaway manager for dev testing).
// There's no public registration route (addAdmin requires an existing admin token), so the very
// first account has to be created directly against the database. Run from server/: `npm run seed:lamus`.
import 'dotenv/config'
import bcrypt from 'bcrypt'
import lamusConnection from '../config/lamusMongodb.js'
import userModel from '../models/LamusUser.js'

const accounts = [
    { name: process.env.LAMUS_SEED_ADMIN_NAME || 'Admin', email: process.env.LAMUS_SEED_ADMIN_EMAIL || '1@1.com', password: process.env.LAMUS_SEED_ADMIN_PASSWORD || '1', role: 'admin' },
    { name: 'Test Manager', email: '2@1.com', password: '1', role: 'manager' },
]

const run = async () => {
    await new Promise((resolve, reject) => {
        lamusConnection.once('connected', resolve)
        lamusConnection.once('error', reject)
    })

    const salt = await bcrypt.genSalt(10)
    for (const acc of accounts) {
        const hashed = await bcrypt.hash(acc.password, salt)
        await userModel.findOneAndUpdate(
            { email: acc.email },
            { name: acc.name, email: acc.email, password: hashed, role: acc.role },
            { upsert: true, new: true }
        )
        console.log(`${acc.role}: ${acc.email} / ${acc.password}`)
    }
    await lamusConnection.close()
}

run().catch(error => {
    console.error(error)
    process.exit(1)
})
