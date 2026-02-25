import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast';
import { assets } from '../assets/assets';

const ChatInterface = ({ room, houseOwner, propertyId, onClose, existingChatId }) => {
  const { axios, getToken, user } = useAppContext();
  const [chat, setChat] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages]);

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      const token = await getToken();

      // If we already have a chat ID (from chat list), load it directly
      if (existingChatId) {
        const { data } = await axios.get(`/api/chat/${existingChatId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (data.success) {
          setChat(data.chat);
          await axios.post('/api/chat/mark-read', { chatId: existingChatId }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          toast.error(data.message);
        }
        return;
      }

      // Otherwise create/find chat (from PropertyDetails)
      const { data } = await axios.post('/api/chat/get-or-create', {
        propertyId: propertyId,
        roomDetails: {
          buildingId: room.buildingId,
          buildingName: room.buildingName,
          row: room.row,
          col: room.col,
          roomType: room.roomType
        },
        houseOwnerId: houseOwner._id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setChat(data.chat);
        // Mark messages as read
        await axios.post('/api/chat/mark-read', {
          chatId: data.chat._id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const token = await getToken();
      const { data } = await axios.post('/api/chat/send', {
        chatId: chat._id,
        content: message
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setChat(data.chat);
        setMessage('');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
        <div className="bg-white rounded-lg p-8">
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <img 
              src={houseOwner.image} 
              alt={houseOwner.username} 
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h3 className="font-semibold">{houseOwner.username}</h3>
              <p className="text-xs text-gray-500">House Owner</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Room Info */}
        <div className="px-4 py-2 bg-gray-50 border-b">
          <p className="text-sm text-gray-600">
            About: <span className="font-medium">{chat?.property?.name}</span> - {room.buildingName} - {room.roomType}
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chat?.messages?.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            chat?.messages?.map((msg, index) => {
              const isOwn = msg.sender === user.id;
              return (
                <div 
                  key={index} 
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    <div className={`rounded-lg px-4 py-2 ${
                      isOwn 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-200 text-gray-800'
                    }`}>
                      <p className="break-words">{msg.content}</p>
                    </div>
                    <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!message.trim()}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dull transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
