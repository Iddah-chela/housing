import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.js';

dotenv.config();

// Connect to MongoDB with proper timeout settings
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 60000, // 60 seconds
      socketTimeoutMS: 60000,
      connectTimeoutMS: 60000
    });
    console.log('📦 Connected to MongoDB');
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    return false;
  }
};

/**
 * Set admin role for a user by email
 * Usage: node setAdmin.js your-email@example.com
 */
async function setAdmin(email) {
  try {
    if (!email) {
      console.error('❌ Please provide an email address');
      console.log('Usage: node setAdmin.js your-email@example.com');
      process.exit(1);
    }

    // Connect to database first
    const connected = await connectDB();
    if (!connected) {
      console.error('❌ Could not connect to database. Please check your MONGODB_URI in .env');
      process.exit(1);
    }

    console.log(`🔍 Searching for user with email: ${email}`);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      console.log('\n💡 Tip: The user must first sign up through the application before you can make them admin');
      process.exit(1);
    }

    console.log(`👤 Found user: ${user.username} (ID: ${user._id})`);
    console.log(`📋 Current role: ${user.role}`);

    if (user.role === 'admin') {
      console.log('✅ User is already an admin!');
      process.exit(0);
    }

    await User.updateOne({ email }, { $set: { role: 'admin' } });
    
    console.log(`✅ Successfully set admin role for: ${email}`);
    console.log('\n🎉 You can now access the admin panel at /admin');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];
setAdmin(email);
