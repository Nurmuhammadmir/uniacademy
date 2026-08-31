// connects to mongodb once at boot, logs when the connection is actually established
import mongoose from "mongoose"

const connectDB = async () => {
    mongoose.connection.on('connected', () => console.log('database connected'))
    await mongoose.connect(`${process.env.MONGO_URI}/uniacademy`, {
        // the driver's own default (100) opens up to 100 sockets, each holding its own read/write
        // buffers, regardless of how many are actually busy - on a RAM-capped box that's paid for
        // 24/7 even at 3am with nobody online. 20 is comfortably more than Node's single event loop
        // will ever have in flight at once for this app's query pattern (short reads/writes, no long
        // aggregations held open), even with several hundred people connected across all 6 apps,
        // since a request only holds a socket for the few ms its own query takes.
        maxPoolSize: 20,
        minPoolSize: 2,
        // sockets that sit idle for a while (overnight, low-traffic hours) are closed and their
        // memory freed instead of being kept warm forever - they get reopened on demand.
        maxIdleTimeMS: 30_000,
    })
}

export default connectDB
