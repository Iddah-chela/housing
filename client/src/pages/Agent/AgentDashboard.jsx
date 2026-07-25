import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Plus, Users, Package, MessageSquare, Loader, CheckCircle, CalendarCheck2, Phone, Settings, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import AgentReputationBadge from '../../components/AgentReputationBadge';
import {
  unwrapAgentLeadItem,
  resolveTenantName,
  resolveTenantPhone,
  formatVacancyLabel,
} from '../../utils/normalizeAgentLead';

export default function AgentDashboard() {
  const { axios, getToken } = useAppContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      const statsRes = await axios.get('/api/agent/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(statsRes.data);

      const leadsRes = await axios.get('/api/agent/leads?status=all&limit=6', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const normalized = (leadsRes.data.leads || [])
        .map(unwrapAgentLeadItem)
        .filter(Boolean)
        .slice(0, 6);
      setRecentLeads(normalized);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900'>
        <Loader className='animate-spin text-indigo-600' size={40} />
      </div>
    );
  }

  const leadTypeStats = stats?.leadTypeStats || {};

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8'>
          <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-4'>
            <div>
              <h1 className='text-3xl md:text-4xl font-bold text-gray-900 dark:text-white'>Dashboard</h1>
              <p className='text-gray-600 dark:text-gray-400 mt-2'>Vacancies, leads, and booking intent at a glance</p>
            </div>
            <div className='flex flex-col sm:flex-row gap-2'>
              <button
                onClick={() => navigate('/agent/settings')}
                className='inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700'
              >
                <Settings size={18} />
                Reputation
              </button>
              <button
                onClick={() => navigate('/agent/post-vacancy')}
                className='inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shadow-sm hover:shadow-md'
              >
                <Plus size={20} />
                Post Vacancy
              </button>
            </div>
          </div>
          {stats?.reputation && (
            <div className='mt-5 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800'>
              <AgentReputationBadge reputation={stats.reputation} showImage />
              {stats.awaitingTenantConfirm > 0 && (
                <p className='text-xs text-indigo-700 dark:text-indigo-300 mt-2'>
                  {stats.awaitingTenantConfirm} placement{stats.awaitingTenantConfirm === 1 ? '' : 's'} awaiting tenant confirmation
                </p>
              )}
              <button
                onClick={() => navigate('/agent/leaderboard')}
                className='mt-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:underline'
              >
                <Trophy size={16} />
                {stats.ranking?.rank
                  ? `Ranked #${stats.ranking.rank} of ${stats.ranking.totalRanked} agents`
                  : 'See the agent leaderboard'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8'>
        {stats && (
          <>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Active Vacancies</p>
                    <p className='text-3xl font-bold text-gray-900 dark:text-white mt-3'>{stats.activeVacancies}</p>
                  </div>
                  <div className='p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl'>
                    <Package className='text-indigo-600' size={28} />
                  </div>
                </div>
              </div>

              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Total Leads</p>
                    <p className='text-3xl font-bold text-gray-900 dark:text-white mt-3'>{stats.totalLeads}</p>
                  </div>
                  <div className='p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl'>
                    <Users className='text-blue-600' size={28} />
                  </div>
                </div>
              </div>

              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Unread Leads</p>
                    <p className='text-3xl font-bold text-gray-900 dark:text-white mt-3'>{stats.unreadLeads}</p>
                  </div>
                  <div className='p-3 bg-orange-50 dark:bg-orange-900/30 rounded-2xl'>
                    <MessageSquare className='text-orange-600' size={28} />
                  </div>
                </div>
              </div>

              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Lead Mix</p>
                    <p className='text-3xl font-bold text-gray-900 dark:text-white mt-3'>
                      {leadTypeStats.contact || 0}/{leadTypeStats.viewing || 0}/{leadTypeStats.booking || 0}
                    </p>
                  </div>
                  <div className='p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl'>
                    <CheckCircle className='text-emerald-600' size={28} />
                  </div>
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5'>
                <p className='text-sm text-gray-600 dark:text-gray-400'>Contact requests</p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white mt-2'>{leadTypeStats.contact || 0}</p>
              </div>
              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5'>
                <p className='text-sm text-gray-600 dark:text-gray-400'>Viewing requests</p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white mt-2'>{leadTypeStats.viewing || 0}</p>
              </div>
              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5'>
                <p className='text-sm text-gray-600 dark:text-gray-400'>Booking intents</p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white mt-2'>{leadTypeStats.booking || 0}</p>
              </div>
            </div>
          </>
        )}

        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>Recent Leads</h2>
            <button
              onClick={() => navigate('/agent/leads')}
              className='text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium'
            >
              View All
            </button>
          </div>

          {recentLeads.length === 0 ? (
            <div className='text-center py-12'>
              <MessageSquare className='mx-auto text-gray-400 mb-4' size={40} />
              <p className='text-gray-600 dark:text-gray-400'>No leads yet. Post a vacancy to get started!</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {recentLeads.map((lead) => (
                <div key={lead._id} className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors'>
                  <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
                    <div>
                      <div className='flex flex-wrap items-center gap-2 mb-1'>
                        <p className='font-semibold text-gray-900 dark:text-white'>
                          {resolveTenantName(lead)}
                        </p>
                        <span className='px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200 capitalize'>
                          {lead.leadType || 'contact'}
                        </span>
                      </div>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {formatVacancyLabel(lead.vacancy, 'Vacancy')}
                      </p>
                    </div>

                    <div className='flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400'>
                      <div className='flex items-center gap-1'>
                        <Phone size={14} />
                        {resolveTenantPhone(lead)}
                      </div>
                      <div className='flex items-center gap-1'>
                        <CalendarCheck2 size={14} />
                        {lead.status || 'new'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
