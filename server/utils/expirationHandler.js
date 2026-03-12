import ViewingRequest from "../models/viewingRequest.js";
import Room from "../models/room.js";
import Chat from "../models/chat.js";

// Auto-expire viewing requests older than 48 hours
export const expireViewingRequests = async () => {
    try {
        const expirationTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

        // Find all pending requests older than 48 hours
        const expiredRequests = await ViewingRequest.find({
            status: 'pending',
            createdAt: { $lt: expirationTime }
        });

        for (const request of expiredRequests) {
            // Update request status
            request.status = 'expired';
            await request.save();

            // Reset room availability
            const room = await Room.findById(request.room);
            if (room && room.availabilityStatus === 'viewing_requested') {
                room.availabilityStatus = 'available';
                await room.save();
            }

            // Send auto-message to renter
            const chat = await Chat.findOne({
                tenant: request.renter,
                houseOwner: request.owner,
                room: request.room
            });

            if (chat) {
                chat.messages.push({
                    sender: 'system',
                    content: 'The owner did not respond to your viewing request within 48 hours. You can request another viewing.',
                    timestamp: new Date(),
                    read: false
                });
                await chat.save();
            }
        }

        return { expired: expiredRequests.length };
    } catch (error) {
        console.error('Error expiring viewing requests:', error);
        return { error: error.message };
    }
};

// Run expiration check (call this from a cron job or interval)
export const runExpirationCheck = async (req, res) => {
    try {
        const result = await expireViewingRequests();
        res.json({ success: true, result });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
