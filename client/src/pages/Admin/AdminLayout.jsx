import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const AdminLayout = () => {
  const { isAdmin, user, authLoading } = useAppContext();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { toast.error('Please login to access admin panel'); navigate('/'); return; }
    if (!isAdmin) { toast.error('Unauthorized - Admin access required'); navigate('/'); return; }
  }, [authLoading, user, isAdmin, navigate]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const navLinks = [
    { name: 'Dashboard', path: '/admin' },
    { name: 'Applications', path: '/admin/applications' },
    { name: 'Announcements', path: '/admin/announcements' },
    { name: 'Reports', path: '/admin/reports' },
    { name: 'Users', path: '/admin/users' },
    { name: 'Listings', path: '/admin/listings' },
    { name: 'Feedback', path: '/admin/feedback' }
  ];

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Admin Panel</h1>
        <p className="text-xs text-gray-500 mt-0.5">Management Dashboard</p>
      </div>
      <nav className="mt-2 flex-1">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === '/admin'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `block px-5 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 border-r-4 border-indigo-600 text-indigo-600 font-medium' : ''
              }`
            }
          >
            {link.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => navigate('/')}
          className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left"
        >
          ← Back to Site
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed on desktop, slide-over on mobile */}
      <div className={`
        fixed lg:static top-0 left-0 h-full w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-30 flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <SidebarContent />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md hover:bg-gray-100"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-gray-800 text-sm">Admin Panel</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
