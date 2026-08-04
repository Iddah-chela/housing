import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import AgentChatInterface from '../../components/AgentChatInterface';
import { Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

const AgentChats = () => {
  const { axios, getToken, user } = useAppContext();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    const chatId = searchParams.get('chatId');
    console.log('[AgentChats] useEffect chatId from params:', chatId, 'chats.length:', chats.length);
    if (chatId && chats.length > 0 && !selectedChat) {
      const target = chats.find(c => c._id === chatId);
      console.log('[AgentChats] Looking for chat:', chatId, 'found:', target?._id);
      if (target) {
        setSelectedChat(target);
        searchParams.delete('chatId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [chats, searchParams]);

  const fetchChats = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/agent-chat/user-chats', { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setChats(data.chats || []);
      else toast.error(data.message || 'Failed to load chats');
    } catch (err) {
      toast.error('Could not load chats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className='flex items-center justify-center h-screen'><Loader className='animate-spin' /></div>;

  return (
    <div className='px-4 md:px-16 lg:px-24 xl:px-32 min-h-screen'>
      <h1 className='text-3xl md:text-4xl font-playfair mb-6'>Agent Messages</h1>
      {chats.length === 0 ? (
        <div className='text-center py-16'>No chats yet</div>
      ) : (
        <div className='space-y-4'>
          {chats.map(chat => (
            <div key={chat._id} onClick={() => setSelectedChat(chat)} className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 overflow-hidden'>
              <div className='flex items-center gap-4 min-w-0'>
                <div className='flex-1 min-w-0'>
                  <h3 className='font-semibold truncate'>{chat.tenant?.username || chat.tenant?.firstName || 'Tenant'}</h3>
                  <p className='text-sm text-gray-500 truncate'>{chat.vacancy?.title || 'Agent Listing'}</p>
                </div>
                <div className='text-xs text-gray-400 shrink-0 whitespace-nowrap'>{new Date(chat.lastMessage || chat.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedChat && (
        <AgentChatInterface
          existingChatId={selectedChat._id}
          room={{ buildingId: selectedChat.roomDetails?.buildingId, buildingName: selectedChat.roomDetails?.buildingName, row: selectedChat.roomDetails?.row, col: selectedChat.roomDetails?.col, roomType: selectedChat.roomDetails?.roomType }}
          vacancyId={selectedChat.vacancy?._id}
          onClose={() => { setSelectedChat(null); fetchChats(); }}
        />
      )}
    </div>
  );
};

export default AgentChats;
