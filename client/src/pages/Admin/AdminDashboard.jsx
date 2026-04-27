import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Users, Home, Building2, ClipboardList, CheckCircle, AlertTriangle, UserX, LayoutList, Shield, FileText, Activity, CalendarClock, BarChart3, Eye } from 'lucide-react';

const roleColors = {
  user: '#3b82f6',
  houseOwner: '#10b981',
  caretaker: '#f59e0b',
  admin: '#8b5cf6',
};

const formatHourLabel = (hour) => {
  const normalized = Number(hour) || 0;
  const period = normalized >= 12 ? 'PM' : 'AM';
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${hour12}:00 ${period}`;
};

const AdminDashboard = () => {
  const { axios, getToken } = useAppContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const fetchStats = useCallback(async ({ silent = false, showLoader = false } = {}) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const token = await getToken();
      const { data } = await axios.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setStats(data.stats);
        setLastUpdatedAt(new Date());
      } else {
        if (!silent) toast.error(data.message);
      }
    } catch (error) {
      if (!silent) toast.error(error.message);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [axios, getToken]);

  useEffect(() => {
    fetchStats({ showLoader: true });

    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStats({ silent: true });
      }
    }, 15000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStats({ silent: true });
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchStats]);

  if (loading) {
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  if (!stats) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">Unable to load dashboard stats right now.</p>
        <button
          onClick={() => fetchStats({ silent: false, showLoader: true })}
          className="mt-3 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Try Again
        </button>
      </div>
    );
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

  const trafficCards = [
    { label: 'Visits Today', value: stats.todayVisits ?? 0, icon: Activity, bg: 'bg-cyan-50 dark:bg-cyan-900/30', iconColor: 'text-cyan-600' },
    { label: 'Visits This Week', value: stats.weekVisits ?? 0, icon: CalendarClock, bg: 'bg-sky-50 dark:bg-sky-900/30', iconColor: 'text-sky-600' },
    { label: 'Visits This Month', value: stats.monthVisits ?? 0, icon: BarChart3, bg: 'bg-violet-50 dark:bg-violet-900/30', iconColor: 'text-violet-600' },
    { label: 'Unique Visitors (30d)', value: stats.uniqueVisitors30d ?? 0, icon: Eye, bg: 'bg-emerald-50 dark:bg-emerald-900/30', iconColor: 'text-emerald-600' },
  ];

  const quickActions = [
    { label: 'Manage Listings', desc: 'Verify, delist, or review properties', path: '/admin/listings', icon: LayoutList, bg: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40', textColor: 'text-indigo-700 dark:text-indigo-300' },
    { label: 'User Management', desc: 'Suspend, unsuspend, or review users', path: '/admin/users', icon: Users, bg: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40', textColor: 'text-blue-700 dark:text-blue-300' },
    { label: 'Applications', desc: 'Review house owner applications', path: '/admin/applications', icon: Shield, bg: 'bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40', textColor: 'text-green-700 dark:text-green-300' },
    { label: 'Reports', desc: 'Handle pending reports', path: '/admin/reports', icon: FileText, bg: 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40', textColor: 'text-red-700 dark:text-red-300' },
  ];

  const hourlyVisits = Array.isArray(stats.visitByHour) ? stats.visitByHour : [];
  const maxHourlyVisits = Math.max(...hourlyVisits.map((row) => row.visits || 0), 1);
  const peakHourText = stats.peakVisitHour
    ? `${formatHourLabel(stats.peakVisitHour.hour)} (${stats.peakVisitHour.visits} visits)`
    : 'No visits yet';

  const roleDist = stats.userRoleDistribution || { user: 0, houseOwner: 0, caretaker: 0, admin: 0 };
  const roleSegments = [
    { key: 'user', label: 'Users', value: roleDist.user || 0, color: roleColors.user },
    { key: 'houseOwner', label: 'House Owners', value: roleDist.houseOwner || 0, color: roleColors.houseOwner },
    { key: 'caretaker', label: 'Caretakers', value: roleDist.caretaker || 0, color: roleColors.caretaker },
    { key: 'admin', label: 'Admin', value: roleDist.admin || 0, color: roleColors.admin },
  ];
  const totalRoleCount = roleSegments.reduce((sum, seg) => sum + seg.value, 0);

  let cumulative = 0;
  const pieGradient = roleSegments
    .filter((seg) => seg.value > 0)
    .map((seg) => {
      const start = cumulative;
      const pct = totalRoleCount ? (seg.value / totalRoleCount) * 100 : 0;
      cumulative += pct;
      return `${seg.color} ${start}% ${cumulative}%`;
    })
    .join(', ');

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6 md:mb-8">Dashboard Overview</h1>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {lastUpdatedAt ? `Live updates every 15s. Last updated: ${lastUpdatedAt.toLocaleTimeString()}` : 'Live updates every 15s.'}
        </p>
        <button
          onClick={() => fetchStats({ silent: false })}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Refresh Now
        </button>
      </div>

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

      <h2 className="text-xl font-semibold mt-8 mb-4">Traffic Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {trafficCards.map((stat, index) => {
          const IconComp = stat.icon;
          return (
            <div key={index} className={`${stat.bg} rounded-xl p-5 hover:shadow-md transition-shadow`}>
              <div className="mb-3">
                <IconComp className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stat.value}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Top Pages (Last 30 Days)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Visits: {stats.totalVisits ?? 0}</p>
        </div>

        {Array.isArray(stats.topPages) && stats.topPages.length > 0 ? (
          <div className="space-y-2">
            {stats.topPages.map((row) => (
              <div key={row.path} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-700/60 px-3 py-2">
                <p className="text-sm text-gray-700 dark:text-gray-200 truncate pr-3">{row.path}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{row.visits}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No visit data yet. Traffic stats will appear after users browse the site.</p>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Peak Visit Times (Last 7 Days)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Peak: {peakHourText}</p>
          </div>

          {hourlyVisits.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[760px] h-56 flex items-end gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
                {hourlyVisits.map((row) => {
                  const height = Math.max(8, Math.round(((row.visits || 0) / maxHourlyVisits) * 180));
                  return (
                    <div key={row.hour} className="flex flex-col items-center gap-2">
                      <div
                        className="w-5 bg-cyan-500/80 hover:bg-cyan-500 rounded-t transition-colors"
                        style={{ height: `${height}px` }}
                        title={`${formatHourLabel(row.hour)}: ${row.visits} visits`}
                      />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{String(row.hour).padStart(2, '0')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No visit timing data yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="text-lg font-semibold mb-4">User Mix</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div
              className="w-44 h-44 rounded-full border border-gray-200 dark:border-gray-700"
              style={{
                background: totalRoleCount > 0
                  ? `conic-gradient(${pieGradient})`
                  : '#e5e7eb',
              }}
              title="User role distribution"
            />
            <div className="flex-1 space-y-2 w-full">
              {roleSegments.map((seg) => {
                const pct = totalRoleCount ? ((seg.value / totalRoleCount) * 100).toFixed(1) : '0.0';
                return (
                  <div key={seg.key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-gray-700 dark:text-gray-200">{seg.label}</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{seg.value} ({pct}%)</span>
                  </div>
                );
              })}
              <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">Caretaker bucket excludes admin and house owner accounts.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
