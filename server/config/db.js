import mongoose from "mongoose";

const connectDB = async ()=>{
    try {
        mongoose.connection.on('connected', ()=> console.log('✅ Database Connected'));
        mongoose.connection.on('error', (err)=> console.error('❌ MongoDB Error:', err));
        mongoose.connection.on('disconnected', ()=> console.log('⚠️  Database Disconnected'));
        
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000, // 30 seconds timeout (increased from 5)
            socketTimeoutMS: 45000, // 45 seconds socket timeout
        })
    } catch (error) {
        console.error('❌ MongoDB Connection Failed:', error.message);
        console.log('🔄 Retrying connection in 5 seconds...');
        // Don't exit immediately - allow server to start and retry
        setTimeout(() => connectDB(), 5000);
    }
}

export default connectDB;