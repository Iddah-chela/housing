import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('📦 Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

/**
 * Manually create a user in MongoDB
 * Usage: node createUser.js <clerkId> <email> <username>
 * Example: node createUser.js user_2abc123xyz iddah@example.com "Iddah Chelangat"
 */
async function createUser(clerkId, email, username) {
  try {
    if (!clerkId || !email || !username) {
      console.error('❌ Missing required arguments');
      console.log('Usage: node createUser.js <clerkId> <email> <username>');
      console.log('Example: node createUser.js user_2abc123xyz iddah@example.com "Iddah Chelangat"');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ _id: clerkId }, { email }] });
    
    if (existingUser) {
      console.log(`⚠️  User already exists:`);
      console.log(`   ID: ${existingUser._id}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Username: ${existingUser.username}`);
      console.log(`   Role: ${existingUser.role}`);
      
      // Ask if they want to set admin role
      console.log('\n💡 To make this user an admin, run:');
      console.log(`   node setAdmin.js ${existingUser.email}`);
      
      process.exit(0);
    }

    // Create new user
    const newUser = await User.create({
      _id: clerkId,
      email,
      username,
      image: 'https://via.placeholder.com/150', // Default placeholder image
      role: 'user'
    });

    console.log('✅ Successfully created user!');
    console.log(`   ID: ${newUser._id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Username: ${newUser.username}`);
    console.log(`   Role: ${newUser.role}`);
    console.log('\n💡 To make this user an admin, run:');
    console.log(`   node setAdmin.js ${newUser.email}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get arguments from command line
const [clerkId, email, ...usernameParts] = process.argv.slice(2);
const username = usernameParts.join(' ');

createUser(clerkId, email, username);
