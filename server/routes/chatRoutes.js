import express from "express";
import { getOrCreateChat, sendMessage, getUserChats, markMessagesAsRead, getChatById } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const chatRouter = express.Router();

chatRouter.post("/get-or-create", protect, getOrCreateChat);
chatRouter.post("/send", protect, sendMessage);
chatRouter.get("/user-chats", protect, getUserChats);
chatRouter.post("/mark-read", protect, markMessagesAsRead);
chatRouter.get("/:chatId", protect, getChatById);

export default chatRouter;
