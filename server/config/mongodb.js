// connects to mongodb once at boot, logs when the connection is actually established
import mongoose from "mongoose"

const connectDB = async () => {
    mongoose.connection.on('connected', () => console.log('database connected'))
    await mongoose.connect(`${process.env.MONGO_URI}/uniacademy`)
}

export default connectDB
