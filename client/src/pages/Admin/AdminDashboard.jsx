import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';

const AdminDashboard = () => {
  const { axios, getToken } = useAppContext();
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
    { label: 'Total Users', value: stats.totalUsers, color: 'blue' },
    { label: 'House Owners', value: stats.totalOwners, color: 'green' },
    { label: 'Total Listings', value: stats.totalRooms, color: 'purple' },
    { label: 'Pending Reports', value: stats.pendingReports, color: 'red' },
    { label: 'Suspended Users', value: stats.suspendedUsers, color: 'orange' }
  ];

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6 md:mb-8">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-600 text-sm mb-2">{stat.label}</p>
            <p className={`text-4xl font-bold text-${stat.color}-600`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="space-y-2">
          <p className="text-gray-600">• Review pending reports</p>
          <p className="text-gray-600">• Verify new listings</p>
          <p className="text-gray-600">• Manage user suspensions</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
