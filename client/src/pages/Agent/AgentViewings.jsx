import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { Loader, CalendarDays, Clock3, MapPin, CheckCircle2, XCircle, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  unwrapAgentLeadItem,
  resolveTenantName,
  resolveTenantPhone,
  formatVacancyLabel,
} from '../../utils/normalizeAgentLead';

const tabConfig = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'denied', label: 'Denied' },
];

const getLeadStatus = (lead) =>
  String(lead?.outcome || lead?.status || '').toLowerCase();

const bucketViewingLead = (lead) => {
  const status = String(lead?.status || '').toLowerCase();
  const outcome = String(lead?.outcome || '').toLowerCase();
  if (['not-fit', 'no-response', 'declined', 'cancelled'].includes(status) || ['not-fit', 'no-response'].includes(outcome)) {
    return 'denied';
  }
  // Appointment confirmed (or later outcomes) — unlocks exact location for tenant
  if (['contacted', 'viewed', 'booked'].includes(status) || ['viewed', 'booked', 'confirmed'].includes(outcome)) {
    return 'confirmed';
  }
  return 'pending';
};

const statusStyles = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700',
  confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
  denied: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700',
};

const AgentViewings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  const { axios, getToken, navigate } = useAppContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    fetchViewings();
  }, []);

  useEffect(() => {
    if (!leadId || items.length === 0) return;
    const target = items.find((item) => String(item._id) === String(leadId));
    if (target) {
      setTab(target._bucket || 'all');
      searchParams.delete('leadId');
      setSearchParams(searchParams, { replace: true });
      setTimeout(() => {
        document.getElementById(`viewing-${target._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [leadId, items]);

  const fetchViewings = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/agent/leads?status=all&limit=500', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const viewingLeads = (data.leads || [])
        .map(unwrapAgentLeadItem)
        .filter(Boolean)
        .filter((lead) => String(lead.leadType || '').toLowerCase() === 'viewing')
        .map((lead) => ({
          ...lead,
          _leadStatus: getLeadStatus(lead),
          _bucket: bucketViewingLead(lead),
        }));
      setItems(viewingLeads);
    } catch (error) {
      console.error('Error fetching viewings:', error);
      toast.error('Could not load viewings');
    } finally {
      setLoading(false);
    }
  };

  const visibleItems = useMemo(() => {
    if (tab === 'all') return items;
    return items.filter((item) => item._bucket === tab);
  }, [items, tab]);

  const counts = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.all += 1;
        acc[item._bucket] += 1;
        return acc;
      },
      { all: 0, pending: 0, confirmed: 0, denied: 0 }
    );
  }, [items]);

  const confirmViewing = async (id) => {
    if (!window.confirm('Confirm this viewing? The tenant will get your contact details, and the exact map pin if this listing has one.')) return;
    try {
      setProcessingId(id);
      const token = await getToken();
      await axios.put(
        `/api/agent/leads/${id}`,
        { status: 'contacted' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const lead = items.find((item) => String(item._id) === String(id));
      const hasPin = !!(
        lead?.vacancy?.location?.coordinates?.latitude
        || lead?.vacancy?.googleMapsUrl
      );
      toast.success(
        hasPin
          ? 'Viewing confirmed — exact location shared with tenant'
          : 'Viewing confirmed — tenant got your contact. Add a map pin on Edit Vacancy so future confirms share Maps directions.'
      );
      await fetchViewings();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to confirm viewing');
    } finally {
      setProcessingId(null);
    }
  };

  const markOutcome = async (id, outcome) => {
    if (!window.confirm(outcome === 'viewed' ? 'Mark this viewing as completed?' : 'Decline this viewing?')) return;
    try {
      setProcessingId(id);
      const token = await getToken();
      await axios.put(
        `/api/agent/leads/${id}/outcome`,
        { outcome },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(outcome === 'viewed' ? 'Viewing marked as completed' : 'Viewing declined');
      await fetchViewings();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update viewing');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Loader className='animate-spin text-indigo-600' />
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'>
        <div>
          <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>Viewing Requests</h1>
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
            Confirm a viewing to share the exact pin with the tenant
          </p>
        </div>
        <button onClick={() => navigate('/agent')} className='text-sm text-indigo-600 dark:text-indigo-400 hover:underline'>
          Back to dashboard
        </button>
      </div>

      <div className='flex gap-2 mb-6 overflow-x-auto pb-2'>
        {tabConfig.map((entry) => (
          <button
            key={entry.key}
            onClick={() => setTab(entry.key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              tab === entry.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {entry.label}
            <span className='ml-2 text-xs opacity-80'>({counts[entry.key]})</span>
          </button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <div className='text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
          <CalendarDays className='w-10 h-10 mx-auto mb-3 text-gray-400 opacity-60' />
          <p className='text-gray-500 dark:text-gray-400'>No {tab !== 'all' ? tab : ''} viewing requests found</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {visibleItems.map((lead) => {
            const id = String(lead._id);
            const bucket = lead._bucket;
            const isConfirmed = bucket === 'confirmed';
            const isDenied = bucket === 'denied';
            const alreadyVisited = String(lead.outcome || '').toLowerCase() === 'viewed'
              || String(lead.status || '').toLowerCase() === 'viewed';
            const name = resolveTenantName(lead);
            const phone = resolveTenantPhone(lead);
            const vacancyLabel = formatVacancyLabel(lead.vacancy, 'Viewing request');
            const preferredDate = lead.preferredViewingDate
              ? new Date(lead.preferredViewingDate).toLocaleDateString('en-KE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : null;
            const timeRange = lead.preferredViewingTimeRange || null;

            return (
              <div
                id={`viewing-${id}`}
                key={id}
                className='bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm'
              >
                <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex flex-wrap items-center gap-2 mb-3'>
                      <h3 className='font-semibold text-gray-900 dark:text-white text-lg'>{name}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[bucket]}`}>
                        {bucket}
                      </span>
                      <span className='px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'>
                        viewing
                      </span>
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300'>
                      <div className='flex items-center gap-2'>
                        <Phone className='w-4 h-4 text-gray-400 shrink-0' />
                        <span>{phone}</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <CalendarDays className='w-4 h-4 text-gray-400 shrink-0' />
                        <span>{lead.createdAt ? new Date(lead.createdAt).toLocaleString() : '—'}</span>
                      </div>
                      <div className='flex items-center gap-2 md:col-span-2'>
                        <MapPin className='w-4 h-4 text-gray-400 shrink-0' />
                        <span>{vacancyLabel}</span>
                      </div>
                      {(preferredDate || timeRange) && (
                        <div className='flex items-center gap-2 md:col-span-2'>
                          <Clock3 className='w-4 h-4 text-gray-400 shrink-0' />
                          <span>
                            {[preferredDate, timeRange].filter(Boolean).join(' · ') || 'Schedule flexible'}
                          </span>
                        </div>
                      )}
                    </div>

                    {lead.message && (
                      <div className='mt-4 rounded-lg bg-gray-50 dark:bg-gray-700/60 p-3 text-sm text-gray-700 dark:text-gray-200'>
                        {lead.message}
                      </div>
                    )}
                  </div>

                  <div className='flex flex-col gap-3 lg:w-56 shrink-0'>
                    {!isConfirmed && !isDenied && (
                      <button
                        disabled={processingId === id}
                        onClick={() => confirmViewing(id)}
                        className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60'
                      >
                        <CheckCircle2 className='w-4 h-4' />
                        {processingId === id ? 'Processing…' : 'Confirm Viewing'}
                      </button>
                    )}
                    {isConfirmed && !alreadyVisited && !isDenied && (
                      <button
                        disabled={processingId === id}
                        onClick={() => markOutcome(id, 'viewed')}
                        className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60'
                      >
                        <CheckCircle2 className='w-4 h-4' />
                        {processingId === id ? 'Processing…' : 'Mark Viewed'}
                      </button>
                    )}
                    {!isDenied && (
                      <button
                        disabled={processingId === id}
                        onClick={() => markOutcome(id, 'not-fit')}
                        className='inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg border border-red-200 hover:bg-red-200 disabled:opacity-60 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700'
                      >
                        <XCircle className='w-4 h-4' />
                        {processingId === id ? 'Processing…' : 'Decline'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AgentViewings;
