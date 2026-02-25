// Helper script to reset the test user for development
// This fixes the issue where test user is stuck as "houseOwner" 
// and the "List Your House" button incorrectly shows as "Dashboard"
//
// Run with: npm run reset-test-user
// Then restart your server

import mongoose from 'mongoose';
import User from './models/user.js';
import House from './models/house.js';
import Room from './models/room.js';
import dotenv from 'dotenv';

dotenv.config();

const resetTestUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const testUserId = 'test-user-123';

        // Delete all rooms associated with test user's house
        const testHouse = await House.findOne({ owner: testUserId });
        if (testHouse) {
            const deletedRooms = await Room.deleteMany({ house: testHouse._id });
            console.log(`Deleted ${deletedRooms.deletedCount} test user rooms`);
        }

        // Delete test user's house
        const deletedHouses = await House.deleteMany({ owner: testUserId });
        console.log(`Deleted ${deletedHouses.deletedCount} test user houses`);

        // Reset test user role to 'user'
        const updatedUser = await User.findByIdAndUpdate(
            testUserId, 
            { role: 'user' },
            { new: true }
        );
        
        if (updatedUser) {
            console.log(`✅ Test user role reset to: "${updatedUser.role}"`);
        } else {
            console.log('⚠️  Test user not found (will be created on next login)');
        }

        console.log('\n✅ Test user reset complete!');
        console.log('💡 Restart your server to see changes');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting test user:', error);
        process.exit(1);
    }
};

resetTestUser();
