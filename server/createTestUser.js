import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.js';

dotenv.config();

const createTestUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Delete existing test user if any
        await User.deleteOne({ _id: 'test-user-123' });
        console.log('Deleted any existing test user');

        // Create new test user
        const user = await User.create({
            _id: 'test-user-123',
            clerkId: 'test-user-123',
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            image: 'https://avatar.iran.liara.run/public',
            role: 'user'
        });

        console.log('Test user created successfully:', user);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createTestUser();
