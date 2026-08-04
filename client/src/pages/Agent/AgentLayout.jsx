import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Bell, Calendar, Eye, Settings, Trophy, MessageSquare } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export default function AgentLayout() {
  const { isAgent, navigate, authLoading, user } = useAppContext();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const location = useLocation();
  const clerkRole = String(user?.publicMetadata?.role || '').toLowerCase();
  const canAccessAgent = isAgent || clerkRole === 'agent';

  useEffect(() => {
    if (!authLoading) {
      setCheckingAccess(false);
    }
  }, [authLoading]);

  useEffect(() => {
    if (!checkingAccess && !authLoading && !canAccessAgent) {
      navigate('/');
    }
  }, [checkingAccess, canAccessAgent, authLoading, navigate]);

  if (authLoading || checkingAccess) {
    return (
      <div className='flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900'>
        <div className='w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin' />
      </div>
    );
  }

  if (!canAccessAgent) {
    return null;
  }

  const navItems = [
    { name: 'Dashboard', path: '/agent', icon: Home },
    { name: 'Post Vacancy', path: '/agent/post-vacancy', icon: LayoutGrid },
    { name: 'My Leads', path: '/agent/leads', icon: Bell },
    { name: 'Messages', path: '/agent/chats', icon: MessageSquare },
    { name: 'Bookings', path: '/agent/bookings', icon: Calendar },
    { name: 'Viewings', path: '/agent/viewings', icon: Eye },
    { name: 'Ranking', path: '/agent/leaderboard', icon: Trophy, hideOnMobile: true },
    { name: 'Settings', path: '/agent/settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className='flex pt-20 min-h-screen'>
      {/* Desktop Sidebar — hidden on mobile */}
      <div className='hidden md:flex md:w-64 border-r min-h-full text-base border-gray-300 dark:border-gray-700 pt-4 flex-col dark:bg-gray-900 flex-shrink-0'>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`flex items-center py-3 px-4 md:px-8 gap-3 transition-colors ${
                isActive(item.path)
                  ? 'border-r-[6px] bg-indigo-600/10 border-indigo-600 text-indigo-600'
                  : 'hover:bg-gray-100/90 dark:hover:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300'
              }`}
            >
              <Icon size={20} className='min-w-[20px]' />
              <span className='text-sm'>{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className='flex-1 p-4 pt-4 md:px-10 pb-24 md:pb-10 overflow-y-auto overflow-x-hidden min-w-0'>
        <Outlet />
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className='md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]'>
        {navItems.filter((item) => !item.hideOnMobile).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                active
                  ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Icon size={24} />
              <span className='text-xs font-medium'>{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
