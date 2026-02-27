import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast';
import ChatInterface from '../components/ChatInterface';

const MyChats = () => {
  const { axios, getToken, user, isOwner } = useAppContext();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  const fetchChats = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/chat/user-chats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setChats(data.chats);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    const now = new Date();
    const msgDate = new Date(date);
    const diffTime = Math.abs(now - msgDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return msgDate.toLocaleDateString();
    }
  };

  const getOtherUser = (chat) => {
    return isOwner ? chat.tenant : chat.houseOwner;
  };

  const getUnreadCount = (chat) => {
    return chat.messages.filter(msg => msg.sender !== user.id && !msg.read).length;
  };

  if (loading) {
    return (
      <div className="py-28 px-4 md:px-16 lg:px-24 xl:px-32 min-h-screen">
        <p className="text-center">Loading your chats...</p>
      </div>
    );
  }

  return (
    <div className="py-28 px-4 md:px-16 lg:px-24 xl:px-32 min-h-screen">
      <h1 className="text-3xl md:text-4xl font-playfair mb-8">My Messages</h1>

      {chats.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No conversations yet</p>
          <p className="text-gray-400 mt-2">Start chatting with house owners to find your perfect place!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {chats.map((chat) => {
            const otherUser = getOtherUser(chat);
            const unreadCount = getUnreadCount(chat);
            const lastMsg = chat.messages[chat.messages.length - 1];

            return (
              <div
                key={chat._id}
                onClick={() => setSelectedChat(chat)}
                className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-all border border-gray-100"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={otherUser.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(otherUser.username || 'U') + '&background=6366f1&color=fff'}
                    alt={otherUser.username}
                    onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(otherUser.username || 'U') + '&background=6366f1&color=fff' }}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{otherUser.username}</h3>
                        <p className="text-sm text-gray-500">
                          {chat.property?.name} - {chat.roomDetails?.buildingName} - {chat.roomDetails?.roomType}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">
                          {formatDate(chat.lastMessage)}
                        </p>
                        {unreadCount > 0 && (
                          <span className="inline-block mt-1 bg-primary text-white text-xs rounded-full px-2 py-0.5">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    {lastMsg && (
                      <p className="text-gray-600 mt-2 truncate">
                        {lastMsg.sender === user.id ? 'You: ' : ''}
                        {lastMsg.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedChat && (
        <ChatInterface
          existingChatId={selectedChat._id}
          room={{
            buildingId: selectedChat.roomDetails?.buildingId,
            buildingName: selectedChat.roomDetails?.buildingName,
            row: selectedChat.roomDetails?.row,
            col: selectedChat.roomDetails?.col,
            roomType: selectedChat.roomDetails?.roomType
          }}
          propertyId={selectedChat.property?._id}
          houseOwner={isOwner ? selectedChat.tenant : selectedChat.houseOwner}
          onClose={() => {
            setSelectedChat(null);
            fetchChats();
          }}
        />
      )}
    </div>
  );
};

export default MyChats;
