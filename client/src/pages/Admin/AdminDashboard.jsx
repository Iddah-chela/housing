import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Users, Home, Building2, ClipboardList, CheckCircle, AlertTriangle, UserX, LayoutList, Shield, FileText } from 'lucide-react';

const AdminDashboard = () => {
  const { axios, getToken } = useAppContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setStats(data.stats);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, bg: 'bg-blue-50 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
    { label: 'House Owners', value: stats.totalOwners, icon: Home, bg: 'bg-green-50 dark:bg-green-900/30', iconColor: 'text-green-600' },
    { label: 'Total Properties', value: stats.totalProperties, icon: Building2, bg: 'bg-purple-50 dark:bg-purple-900/30', iconColor: 'text-purple-600' },
    { label: 'Active Listings', value: stats.activeListings, icon: ClipboardList, bg: 'bg-indigo-50 dark:bg-indigo-900/30', iconColor: 'text-indigo-600' },
    { label: 'Verified', value: stats.verifiedListings, icon: CheckCircle, bg: 'bg-teal-50 dark:bg-teal-900/30', iconColor: 'text-teal-600' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: AlertTriangle, bg: 'bg-red-50 dark:bg-red-900/30', iconColor: 'text-red-600' },
    { label: 'Suspended Users', value: stats.suspendedUsers, icon: UserX, bg: 'bg-orange-50 dark:bg-orange-900/30', iconColor: 'text-orange-600' }
  ];

  const quickActions = [
    { label: 'Manage Listings', desc: 'Verify, delist, or review properties', path: '/admin/listings', icon: LayoutList, bg: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40', textColor: 'text-indigo-700 dark:text-indigo-300' },
    { label: 'User Management', desc: 'Suspend, unsuspend, or review users', path: '/admin/users', icon: Users, bg: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40', textColor: 'text-blue-700 dark:text-blue-300' },
    { label: 'Applications', desc: 'Review house owner applications', path: '/admin/applications', icon: Shield, bg: 'bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40', textColor: 'text-green-700 dark:text-green-300' },
    { label: 'Reports', desc: 'Handle pending reports', path: '/admin/reports', icon: FileText, bg: 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40', textColor: 'text-red-700 dark:text-red-300' },
  ];

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6 md:mb-8">Dashboard Overview</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const IconComp = stat.icon;
          return (
            <div key={index} className={`${stat.bg} rounded-xl p-5 hover:shadow-md transition-shadow`}>
              <div className="mb-3">
                <IconComp className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-gray-500 text-sm mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const IconComp = action.icon;
          return (
            <button
              key={index}
              onClick={() => navigate(action.path)}
              className={`text-left p-5 rounded-xl ${action.bg} hover:shadow-md transition-all`}
            >
              <IconComp className={`w-5 h-5 ${action.textColor} mb-2`} />
              <p className={`font-semibold ${action.textColor}`}>{action.label}</p>
              <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDashboard;
