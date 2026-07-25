import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Eye, EyeOff, Save, Star, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import AgentReputationBadge from '../../components/AgentReputationBadge';

export default function AgentSettings() {
  const { axios, getToken } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [hideRealName, setHideRealName] = useState(false);
  const [reputation, setReputation] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get('/api/agent/reputation/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) {
          setDisplayName(data.settings?.displayName || '');
          setHideRealName(!!data.settings?.hideRealName);
          setReputation(data.reputation);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, [axios, getToken]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      const { data } = await axios.put(
        '/api/agent/reputation/settings',
        { displayName, hideRealName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success('Settings saved');
        setReputation(data.reputation);
      } else {
        toast.error(data.message || 'Save failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='flex justify-center py-20'>
        <div className='w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin' />
      </div>
    );
  }

  return (
    <div className='max-w-2xl mx-auto'>
      <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2'>Reputation & Privacy</h1>
      <p className='text-sm text-gray-600 dark:text-gray-400 mb-6'>
        Control how your name appears on listings. Ratings and placements only grow after a tenant confirms they got the house.
      </p>

      <div className='bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6'>
        <p className='text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3'>Public preview</p>
        <AgentReputationBadge reputation={reputation} showImage />
      </div>

      <form onSubmit={handleSave} className='bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-5'>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>Display name (optional)</label>
          <input
            type='text'
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={80}
            placeholder='e.g. James Mwangi or Annex Homes Agent'
            className='w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-indigo-500'
          />
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
            If empty and name is visible, your account name is shown.
          </p>
        </div>

        <label className='flex items-start gap-3 cursor-pointer'>
          <input
            type='checkbox'
            checked={hideRealName}
            onChange={(e) => setHideRealName(e.target.checked)}
            className='mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500'
          />
          <span>
            <span className='flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-100'>
              {hideRealName ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
              Hide my real account name
            </span>
            <span className='block text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
              When hidden, listings show your display name — or “Verified Agent” if display name is empty. Your account username and profile photo stay private.
            </span>
          </span>
        </label>

        <div className='flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 pt-1'>
          <span className='inline-flex items-center gap-1'><Star className='w-3.5 h-3.5 text-amber-400' /> Tenant ratings after confirmed placements</span>
          <span className='inline-flex items-center gap-1'><BadgeCheck className='w-3.5 h-3.5 text-indigo-500' /> Verified Agent badge</span>
        </div>

        <button
          type='submit'
          disabled={saving}
          className='inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium'
        >
          <Save className='w-4 h-4' />
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
