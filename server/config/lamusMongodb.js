// LamusWater - a separate water-delivery CRM for an unrelated business, sharing only this VPS/Mongo
// server with the school platform (same reasoning as Shanti - see shantiRoute.js). Unlike Shanti
// (which reuses the "uniacademy" database with shanti-prefixed collections), Lamus gets its own
// database ("lamuswater") on the same mongod process via a second, independent connection - its
// models reuse short names ('user', 'client', 'order'...) that would otherwise collide head-on with
// this platform's own models of the same name, so full database-level isolation is simpler and
// safer than prefixing every collection/model by hand.
import mongoose from "mongoose"

const lamusConnection = mongoose.createConnection(`${process.env.MONGO_URI}/lamuswater`, {
    // a low-traffic side project next to the main 6-app connection (see config/mongodb.js) - no
    // need for that connection's larger pool.
    maxPoolSize: 5,
    minPoolSize: 1,
    maxIdleTimeMS: 30_000,
})

lamusConnection.on('connected', () => console.log('lamuswater database connected'))
lamusConnection.on('error', (error) => console.error('lamuswater MongoDB connection error:', error.message))

export default lamusConnection
