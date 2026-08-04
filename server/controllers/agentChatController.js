import AgentChat from '../models/agentChat.js';
import AgentVacancy from '../models/agentVacancy.js';
import User from '../models/user.js';
import { sendEmail } from '../utils/mailer.js';
import { sendPushNotification } from '../utils/pushNotifier.js';

const normalizeRoomDetails = (roomDetails) => {
  const parsedRow = Number(roomDetails?.row);
  const parsedCol = Number(roomDetails?.col);
  return {
    buildingId: roomDetails?.buildingId || 'agent-listing',
    buildingName: roomDetails?.buildingName || 'Main Building',
    row: Number.isFinite(parsedRow) ? parsedRow : 0,
    col: Number.isFinite(parsedCol) ? parsedCol : 0,
    roomType: roomDetails?.roomType || 'vacancy'
  };
};

export const getOrCreateAgentChat = async (req, res) => {
  try {
    const { vacancyId, roomDetails } = req.body;
    const userId = req.user._id;
    console.log('[agentChat] getOrCreateAgentChat called by userId=', userId, 'for vacancyId=', vacancyId);

    const vacancy = await AgentVacancy.findOne({
      _id: vacancyId,
      isActive: true,
    });

    if (!vacancy) {
      console.warn('[agentChat] Vacancy not found:', vacancyId);
      return res.json({ success: false, message: 'Vacancy not found' });
    }

    const agentId = vacancy.agent;
    if (!agentId) {
      console.warn('[agentChat] Agent not found on vacancy:', vacancyId);
      return res.json({ success: false, message: 'Agent not found' });
    }

    const normalizedRoomDetails = normalizeRoomDetails(roomDetails);

    // If the caller is the agent themselves, find or create a chat where they are the agent
    // Otherwise, create a chat where the caller is the tenant
    const isCallerAgent = String(agentId) === String(userId);
    console.log('[agentChat] isCallerAgent=', isCallerAgent);

    let chat;
    if (isCallerAgent) {
      // Agents should only open existing chats from the leads/chat inbox.
      chat = await AgentChat.findOne({
        agent: agentId,
        vacancy: vacancyId,
        'roomDetails.buildingId': normalizedRoomDetails.buildingId,
        'roomDetails.row': normalizedRoomDetails.row,
        'roomDetails.col': normalizedRoomDetails.col
      }).populate('tenant agent vacancy');

      if (!chat) {
        console.warn('[agentChat] Agent attempted to open orphan chat on vacancy without an existing tenant chat:', vacancyId);
        return res.status(400).json({ success: false, message: 'Agents can only open chats from the leads inbox once a tenant has contacted this vacancy.' });
      }
    } else {
      // Tenant calling to chat with the agent
      chat = await AgentChat.findOne({
        tenant: userId,
        agent: agentId,
        vacancy: vacancyId,
        'roomDetails.buildingId': normalizedRoomDetails.buildingId,
        'roomDetails.row': normalizedRoomDetails.row,
        'roomDetails.col': normalizedRoomDetails.col
      }).populate('tenant agent vacancy');

      if (!chat) {
        chat = await AgentChat.create({
          tenant: userId,
          agent: agentId,
          vacancy: vacancyId,
          roomDetails: normalizedRoomDetails,
          messages: []
        });
        chat = await AgentChat.findById(chat._id).populate('tenant agent vacancy');
      }
    }

    console.log('[agentChat] Returning chat:', chat._id);
    res.json({ success: true, chat });
  } catch (error) {
    console.error('[agentChat] getOrCreateAgentChat error:', error.message);
    res.json({ success: false, message: error.message });
  }
};

export const sendAgentMessage = async (req, res) => {
  try {
    const { chatId, content } = req.body;
    const senderId = req.user._id;
    console.log('[agentChat] sendAgentMessage by senderId=', senderId, 'chatId=', chatId);

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.json({ success: false, message: 'Message cannot be empty' });
    }
    if (content.length > 5000) {
      return res.json({ success: false, message: 'Message is too long (max 5000 characters)' });
    }

    const chat = await AgentChat.findById(chatId);
    if (!chat) {
      console.warn('[agentChat] Chat not found for send:', chatId);
      return res.json({ success: false, message: 'Chat not found' });
    }

    const isTenant = String(chat.tenant) === String(senderId);
    const isAgent = String(chat.agent) === String(senderId);
    console.log('[agentChat] isTenant=', isTenant, 'isAgent=', isAgent, 'chat.tenant=', chat.tenant, 'chat.agent=', chat.agent, 'senderId=', senderId);
    
    if (!isTenant && !isAgent) {
      console.warn('[agentChat] Unauthorized send attempt: senderId=', senderId, 'chat.tenant=', chat.tenant, 'chat.agent=', chat.agent);
      return res.json({ success: false, message: 'Unauthorized' });
    }

    chat.messages.push({
      sender: senderId,
      content,
      timestamp: new Date(),
      read: false
    });
    chat.lastMessage = new Date();

    const recipientId = isTenant ? String(chat.agent) : String(chat.tenant);

    await chat.save();

    const updatedChat = await AgentChat.findById(chatId).populate('tenant agent vacancy');
    res.json({ success: true, chat: updatedChat });

    (async () => {
      try {
        const [sender, recipient, vacancy] = await Promise.all([
          User.findById(senderId),
          User.findById(recipientId),
          AgentVacancy.findById(chat.vacancy).select('title').lean()
        ]);

        const listingTitle = vacancy?.title || 'an agent listing';

        if (recipient?.email) {
          sendEmail(
            recipient.email,
            `New message from ${sender?.username || 'someone'} — PataKeja`,
            `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#222;">
                <div style="background:#4F46E5;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
                    <h2 style="color:#fff;margin:0;font-size:18px;">New Message on PataKeja</h2>
                </div>
                <div style="padding:20px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">You have a new message about <strong>${listingTitle}</strong>:</p>
                    <div style="background:#f3f4f6;border-radius:8px;padding:12px 16px;margin:0 0 12px;">
                        <p style="margin:0;font-size:14px;color:#333;">${content.length > 200 ? content.substring(0, 200) + '...' : content}</p>
                    </div>
                    <p style="font-size:13px;color:#888;margin:0;">Open PataKeja to reply.</p>
                </div>
            </div>`
          ).catch(() => {});
        }

        const targetUrl = isTenant ? `/agent/chats?chatId=${chatId}` : `/my-chats?chatId=${chatId}`;

        sendPushNotification(recipientId, {
          title: 'New agent chat message',
          body: content.length > 100 ? content.substring(0, 100) + '...' : content,
          url: targetUrl,
          tag: `agent-chat-${chatId}`
        });
      } catch (_) {
        // Ignore notification errors
      }
    })();
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getAgentChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await AgentChat.find({
      $or: [
        { tenant: userId },
        { agent: userId }
      ]
    }).populate('tenant agent vacancy').sort({ lastMessage: -1 });

    res.json({ success: true, chats });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getAgentChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    console.log('[agentChat] getAgentChatById called by userId=', userId, 'for chatId=', chatId);

    const chat = await AgentChat.findById(chatId).populate('tenant agent vacancy');
    if (!chat) {
      console.warn('[agentChat] Chat not found with id:', chatId);
      return res.json({ success: false, message: 'Chat not found' });
    }

    console.log('[agentChat] Found chat, tenant:', chat.tenant?._id || chat.tenant, 'agent:', chat.agent?._id || chat.agent);
    const isTenant = String(chat.tenant?._id || chat.tenant) === String(userId);
    const isAgent = String(chat.agent?._id || chat.agent) === String(userId);
    console.log('[agentChat] isTenant=', isTenant, 'isAgent=', isAgent, 'userId=', userId);

    if (!isTenant && !isAgent) {
      console.warn('[agentChat] Unauthorized access: userId=', userId, 'doesn\'t match tenant/agent');
      return res.json({ success: false, message: 'Unauthorized' });
    }

    res.json({ success: true, chat });
  } catch (error) {
    console.error('[agentChat] getAgentChatById error:', error.message);
    res.json({ success: false, message: error.message });
  }
};

export const markAgentMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user._id;

    const chat = await AgentChat.findById(chatId);
    if (!chat) {
      return res.json({ success: false, message: 'Chat not found' });
    }

    chat.messages.forEach((message) => {
      if (String(message.sender) !== String(userId) && !message.read) {
        message.read = true;
      }
    });

    await chat.save();
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
