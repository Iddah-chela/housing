import { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Loader, Trophy, Star, Users, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

const medalFor = (rank) => {
  if (rank === 1) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  if (rank === 2) return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  if (rank === 3) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
  return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
};

export default function AgentLeaderboard() {
  const { axios, getToken, navigate } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [you, setYou] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const headers = {};
      try {
        const token = await getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      } catch (_) {
        // leaderboard is public; continue unauthenticated
      }
      const { data } = await axios.get('/api/agent/leaderboard?limit=25', { headers });
      setEntries(data.leaderboard || []);
      setYou(data.you || null);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      toast.error('Could not load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [axios, getToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader className='animate-spin text-indigo-600' />
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6'>
        <div>
          <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
            <Trophy className='w-6 h-6 text-amber-500' /> Agent Leaderboard
          </h1>
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
            Ranked by tenant-confirmed placements and ratings. Top agents get higher placement in the Houses feed.
          </p>
        </div>
        <button
          onClick={() => navigate('/agent')}
          className='text-sm text-indigo-600 dark:text-indigo-400 hover:underline self-start'
        >
          Back to dashboard
        </button>
      </div>

      {you && (
        <div className='mb-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800'>
          <p className='text-sm font-semibold text-indigo-900 dark:text-indigo-100'>
            {you.rank ? `You are #${you.rank} of ${you.totalRanked} ranked agents` : 'You are not ranked yet'}
          </p>
          <p className='text-xs text-indigo-700 dark:text-indigo-300 mt-1'>
            {you.rank
              ? 'Close more confirmed placements to climb — every confirmed tenant counts once.'
              : 'Your first tenant-confirmed placement puts you on the board.'}
          </p>
        </div>
      )}

      {entries.length === 0 ? (
        <div className='text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
          <Trophy className='w-10 h-10 mx-auto mb-3 text-gray-400 opacity-60' />
          <p className='text-gray-600 dark:text-gray-400'>No ranked agents yet.</p>
          <p className='text-sm text-gray-500 dark:text-gray-500 mt-1'>
            The board fills up once tenants confirm their first placements.
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          {entries.map((entry) => (
            <div
              key={`${entry.rank}-${entry.name}`}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-shadow ${
                entry.isYou
                  ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/60 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold ${medalFor(entry.rank)}`}>
                {entry.rank}
              </div>

              {entry.image ? (
                <img
                  src={entry.image}
                  alt={entry.name}
                  className='w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600 shrink-0'
                />
              ) : (
                <div className='w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0'>
                  <Users className='w-5 h-5 text-gray-400' />
                </div>
              )}

              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='font-semibold text-gray-900 dark:text-white truncate'>{entry.name}</p>
                  {entry.isYou && (
                    <span className='text-xs px-2 py-0.5 rounded-full bg-indigo-600 text-white font-medium'>You</span>
                  )}
                  {entry.tierLabel && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      entry.tier === 'top'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    }`}>
                      {entry.tierLabel}
                    </span>
                  )}
                </div>
                <p className='text-xs text-gray-600 dark:text-gray-400 mt-0.5'>
                  {entry.successfulPlacements} confirmed placement{entry.successfulPlacements === 1 ? '' : 's'}
                </p>
              </div>

              <div className='text-right shrink-0'>
                {entry.ratingAvg != null ? (
                  <span className='inline-flex items-center gap-1 text-sm font-medium text-gray-800 dark:text-gray-100'>
                    <Star className='w-4 h-4 fill-amber-400 text-amber-400' />
                    {entry.ratingAvg.toFixed(1)}
                    <span className='text-xs text-gray-500 dark:text-gray-400'>({entry.ratingCount})</span>
                  </span>
                ) : (
                  <span className='text-xs text-gray-500 dark:text-gray-400'>No ratings</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className='mt-8 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'>
        <p className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
          <Share2 className='w-4 h-4 text-indigo-500' /> How to climb
        </p>
        <ul className='mt-2 space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside'>
          <li>Confirm viewings quickly — tenants get the exact location instantly.</li>
          <li>Mark a placement as booked, then ask the tenant to confirm it.</li>
          <li>Share your listing links so more tenants reach you directly.</li>
        </ul>
      </div>
    </div>
  );
}
