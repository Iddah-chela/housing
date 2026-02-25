import mongoose from "mongoose";

const messageSchema = mongoose.Schema({
    sender: {
        type: String,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default: false
    }
}, {timestamps: true});

const chatSchema = mongoose.Schema({
    tenant: {
        type: String,
        ref: "User",
        required: true
    },
    houseOwner: {
        type: String,
        ref: "User",
        required: true
    },
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
        required: true
    },
    roomDetails: {
        buildingId: { type: String, required: true },
        buildingName: { type: String, required: true },
        row: { type: Number, required: true },
        col: { type: Number, required: true },
        roomType: { type: String, required: true }
    },
    messages: [messageSchema],
    lastMessage: {
        type: Date,
        default: Date.now
    }
}, {timestamps: true});

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
