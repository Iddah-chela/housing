import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast';
import ChatInterface from '../components/ChatInterface';
import AgentChatInterface from '../components/AgentChatInterface';
import { ChatListSkeleton } from '../components/Skeletons';
import { useSearchParams } from 'react-router-dom';

const MyChats = () => {
  const { axios, getToken, user, isOwner, isAgent } = useAppContext();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  // Deep-link: auto-open chat from notification
  useEffect(() => {
    const chatId = searchParams.get('chatId');
    if (chatId && chats.length > 0 && !selectedChat) {
      const target = chats.find(c => c._id === chatId);
      if (target) {
        setSelectedChat(target);
        // Clean up the URL
        searchParams.delete('chatId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [chats, searchParams]);

  const fetchChats = async () => {
    try {
      const token = await getToken();
      const allChats = [];

      // Fetch landlord chats (if user is not only an agent)
      if (!isAgent || isOwner) {
        try {
          const { data: landlordData } = await axios.get('/api/chat/user-chats', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (landlordData.success && landlordData.chats) {
            allChats.push(...landlordData.chats.map(c => ({ ...c, _chatType: 'landlord' })));
          }
        } catch (err) {
          console.error('Failed to fetch landlord chats:', err);
        }
      }

      // Fetch agent chats (if user is an agent)
      if (isAgent) {
        try {
          const { data: agentData } = await axios.get('/api/agent-chat/user-chats', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (agentData.success && agentData.chats) {
            allChats.push(...agentData.chats.map(c => ({ ...c, _chatType: 'agent' })));
          }
        } catch (err) {
          console.error('Failed to fetch agent chats:', err);
        }
      }

      // Sort by last message date
      allChats.sort((a, b) => {
        const aDate = new Date(a.lastMessage || a.updatedAt || 0);
        const bDate = new Date(b.lastMessage || b.updatedAt || 0);
        return bDate - aDate;
      });

      setChats(allChats);
    } catch (error) {
      toast.error('Could not load chats. Please try again.');
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
    if (chat._chatType === 'agent') {
      return chat.tenant;
    }
    return isOwner ? chat.tenant : chat.houseOwner;
  };

  const getChatTitle = (chat) => {
    if (chat._chatType === 'agent') {
      return chat.vacancy?.title || 'Agent Listing';
    }
    return '';
  };

  const getUnreadCount = (chat) => {
    if (!chat.messages) return 0;
    return chat.messages.filter(msg => msg.sender !== user.id && !msg.read).length;
  };

  if (loading) {
    return (
      <div className="py-28 px-4 md:px-16 lg:px-24 xl:px-32 min-h-screen">
        <div className='h-9 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-8 animate-pulse' />
        <div className='space-y-0'>
          {[...Array(5)].map((_, i) => <ChatListSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="py-28 px-4 md:px-16 lg:px-24 xl:px-32 min-h-screen">
      <h1 className="text-3xl md:text-4xl font-playfair mb-8">My Messages</h1>

      {chats.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No conversations yet</p>
          <p className="text-gray-400 dark:text-gray-500 mt-2">Start chatting with house owners or agents to find your perfect place!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {chats.map((chat) => {
            const otherUser = getOtherUser(chat);
            const chatTitle = getChatTitle(chat);
            const unreadCount = getUnreadCount(chat);
            const lastMsg = chat.messages?.[chat.messages.length - 1];

            return (
              <div
                key={chat._id}
                onClick={() => setSelectedChat(chat)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 overflow-hidden"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <img
                    src={otherUser?.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(otherUser?.username || 'U') + '&background=6366f1&color=fff'}
                    alt={otherUser?.username}
                    onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(otherUser?.username || 'U') + '&background=6366f1&color=fff' }}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-3 min-w-0">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg truncate">{otherUser?.username}</h3>
                        {chatTitle && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{chatTitle}</p>
                        )}
                        {chat._chatType === 'agent' && (
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Agent Chat</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(chat.lastMessage || chat.updatedAt)}
                        </p>
                        {unreadCount > 0 && (
                          <span className="inline-block mt-1 bg-indigo-600 text-white text-xs rounded-full px-2 py-0.5">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    {lastMsg && (
                      <p className="text-gray-600 dark:text-gray-400 mt-2 truncate text-sm min-w-0">
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
        selectedChat._chatType === 'agent' ? (
          <AgentChatInterface
            existingChatId={selectedChat._id}
            room={{ buildingId: selectedChat.roomDetails?.buildingId, buildingName: selectedChat.roomDetails?.buildingName, row: selectedChat.roomDetails?.row, col: selectedChat.roomDetails?.col, roomType: selectedChat.roomDetails?.roomType }}
            vacancyId={selectedChat.vacancy?._id}
            onClose={() => { setSelectedChat(null); fetchChats(); }}
          />
        ) : (
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
        )
      )}
    </div>
  );
};

export default MyChats;
