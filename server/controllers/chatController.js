import Chat from "../models/chat.js";
import User from "../models/user.js";
import Property from "../models/property.js";

// Get or create a chat between tenant and house owner for a specific room
export const getOrCreateChat = async (req, res) => {
    try {
        const { propertyId, roomDetails, houseOwnerId } = req.body;
        const tenantId = req.user._id;

        // Validate property exists
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.json({ success: false, message: "Property not found" });
        }

        // Check if chat already exists for this specific room
        let chat = await Chat.findOne({
            tenant: tenantId,
            houseOwner: houseOwnerId,
            property: propertyId,
            'roomDetails.buildingId': roomDetails.buildingId,
            'roomDetails.row': roomDetails.row,
            'roomDetails.col': roomDetails.col
        }).populate('tenant houseOwner property');

        // If chat doesn't exist, create new one
        if (!chat) {
            chat = await Chat.create({
                tenant: tenantId,
                houseOwner: houseOwnerId,
                property: propertyId,
                roomDetails: {
                    buildingId: roomDetails.buildingId,
                    buildingName: roomDetails.buildingName,
                    row: roomDetails.row,
                    col: roomDetails.col,
                    roomType: roomDetails.roomType
                },
                messages: []
            });
            chat = await Chat.findById(chat._id).populate('tenant houseOwner property');
        }

        res.json({ success: true, chat });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Send a message
export const sendMessage = async (req, res) => {
    try {
        const { chatId, content } = req.body;
        const senderId = req.user._id;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.json({ success: false, message: "Chat not found" });
        }

        // Verify sender is part of the chat
        if (chat.tenant !== senderId && chat.houseOwner !== senderId) {
            return res.json({ success: false, message: "Unauthorized" });
        }

        // Add message to chat
        chat.messages.push({
            sender: senderId,
            content,
            timestamp: new Date(),
            read: false
        });
        chat.lastMessage = new Date();

        await chat.save();

        const updatedChat = await Chat.findById(chatId).populate('tenant houseOwner property');
        res.json({ success: true, chat: updatedChat });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get all chats for a user
export const getUserChats = async (req, res) => {
    try {
        const userId = req.user._id;

        const chats = await Chat.find({
            $or: [
                { tenant: userId },
                { houseOwner: userId }
            ]
        }).populate('tenant houseOwner property').sort({ lastMessage: -1 });

        res.json({ success: true, chats });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get a single chat by ID
export const getChatById = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        const chat = await Chat.findById(chatId).populate('tenant houseOwner property');
        if (!chat) {
            return res.json({ success: false, message: "Chat not found" });
        }

        // Verify user has access
        if (chat.tenant._id !== userId && chat.houseOwner._id !== userId) {
            return res.json({ success: false, message: "Unauthorized" });
        }

        res.json({ success: true, chat });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
    try {
        const { chatId } = req.body;
        const userId = req.user._id;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.json({ success: false, message: "Chat not found" });
        }

        // Mark all messages from the other user as read
        chat.messages.forEach(message => {
            if (message.sender !== userId && !message.read) {
                message.read = true;
            }
        });

        await chat.save();
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
