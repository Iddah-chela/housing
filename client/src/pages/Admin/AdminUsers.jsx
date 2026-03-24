import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';

const AdminUsers = () => {
  const { axios, getToken } = useAppContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) setUsers(data.users);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (userId) => {
    if (!confirm('Suspend this user?')) return;
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/admin/suspend-user', { userId, reason: 'Suspended by admin' }, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) { toast.success('User suspended'); fetchUsers(); }
      else toast.error(data.message);
    } catch (error) { toast.error(error.message); }
  };

  const handleUnsuspend = async (userId) => {
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/admin/unsuspend-user', { userId }, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) { toast.success('User unsuspended'); fetchUsers(); }
      else toast.error(data.message);
    } catch (error) { toast.error(error.message); }
  };

  const handleDelete = async (userId, username) => {
    if (!confirm(`Permanently delete account for "${username}"? This cannot be undone.`)) return;
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/admin/delete-user', { userId }, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) { toast.success('Account deleted'); fetchUsers(); }
      else toast.error(data.message);
    } catch (error) { toast.error(error.message); }
  };

  const handleRevokeLandlord = async (userId) => {
    if (!confirm('Revoke house owner status? All their listings will be delisted.')) return;
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/admin/revoke-landlord', { userId }, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) { toast.success('House owner status revoked'); fetchUsers(); }
      else toast.error(data.message);
    } catch (error) { toast.error(error.message); }
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold">Users Management</h1>
        <span className="text-sm text-gray-500">{filtered.length} users</span>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or email..."
        className="w-full mb-4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
      />

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={user.image} alt="" className="w-8 h-8 rounded-full shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{user.username}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                        user.role === 'houseOwner' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {user.role === 'houseOwner' ? 'House Owner' : user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.isSuspended ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      }`}>
                        {user.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.role !== 'admin' && (
                        <div className="flex flex-wrap gap-1.5">
                          {user.isSuspended ? (
                            <button onClick={() => handleUnsuspend(user._id)}
                              className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50">
                              Unsuspend
                            </button>
                          ) : (
                            <button onClick={() => handleSuspend(user._id)}
                              className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50">
                              Suspend
                            </button>
                          )}
                          {user.role === 'houseOwner' && (
                            <button onClick={() => handleRevokeLandlord(user._id)}
                              className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50">
                              Revoke Owner Status
                            </button>
                          )}
                          <button onClick={() => handleDelete(user._id, user.username)}
                            className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50">
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
