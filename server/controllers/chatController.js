import Chat from "../models/chat.js";
import User from "../models/user.js";
import Property from "../models/property.js";
import { sendEmail } from "../utils/mailer.js";

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

        // Notify the other user via email (non-blocking)
        const recipientId = senderId === chat.tenant.toString() ? chat.houseOwner : chat.tenant;
        const [sender, recipient] = await Promise.all([
            User.findById(senderId),
            User.findById(recipientId)
        ]);
        if (recipient?.email) {
            const propertyName = updatedChat.property?.name || 'a property';
            sendEmail(
                recipient.email,
                `New message from ${sender?.username || 'someone'} on CampusCrib`,
                `<div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:520px;margin:auto;color:#222;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
                    <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px;text-align:center;">
                        <h2 style="color:#fff;margin:0;font-size:20px;">New Message</h2>
                    </div>
                    <div style="padding:20px 24px;background:#fff;">
                        <p style="font-size:14px;line-height:1.6;"><strong>${sender?.username || 'Someone'}</strong> sent you a message about <strong style="color:#4F46E5;">${propertyName}</strong>:</p>
                        <div style="background:#f3f4f6;border-radius:8px;padding:12px 16px;margin:12px 0;">
                            <p style="margin:0;font-size:14px;color:#333;">"${content.length > 200 ? content.substring(0, 200) + '...' : content}"</p>
                        </div>
                        <p style="font-size:13px;color:#888;margin-top:12px;">Log in to CampusCrib to reply.</p>
                    </div>
                </div>`
            ).catch(() => {});
        }

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
