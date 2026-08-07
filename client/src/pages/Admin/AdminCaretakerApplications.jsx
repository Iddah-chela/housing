import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Loader, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCaretakerApplications() {
  const { axios, getToken } = useAppContext();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedApp, setSelectedApp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get(
        `/api/caretaker-applications?status=${statusFilter}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApplications(res.data.applications || []);
    } catch (error) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appId) => {
    try {
      setProcessing(appId);
      const token = await getToken();
      await axios.put(
        `/api/caretaker-applications/${appId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Caretaker approved');
      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (appId) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setProcessing(appId);
      const token = await getToken();
      await axios.put(
        `/api/caretaker-applications/${appId}/reject`,
        { reason: rejectReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Application rejected');
      fetchApplications();
      setSelectedApp(null);
      setRejectReason('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className='p-4 md:p-6'>
      <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4'>Caretaker Applications</h1>

      <div className='flex gap-2 mb-6 flex-wrap'>
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
              statusFilter === s
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className='flex justify-center py-16'>
          <Loader className='animate-spin' />
        </div>
      ) : applications.length === 0 ? (
        <p className='text-gray-500'>No applications</p>
      ) : (
        <div className='space-y-3'>
          {applications.map((app) => (
            <div
              key={app._id}
              className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4'
            >
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                <div>
                  <p className='font-semibold text-gray-900 dark:text-gray-100'>
                    {app.firstName || app.lastName
                      ? `${app.firstName || ''} ${app.lastName || ''}`.trim()
                      : app.email}
                  </p>
                  <p className='text-sm text-gray-500'>{app.email} · {app.phone}</p>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                    {app.yearsExperience} yrs · {(app.areasManaged || []).join(', ')}
                  </p>
                  <p className='text-xs text-gray-400 mt-1'>ID: {app.idNumber}</p>
                </div>
                <div className='flex gap-2 items-center'>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                    app.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    app.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>{app.status}</span>
                  <button
                    onClick={() => setSelectedApp(app)}
                    className='text-sm text-teal-600 hover:underline'
                  >
                    Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedApp && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4' onClick={() => setSelectedApp(null)}>
          <div
            className='bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto'
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className='text-xl font-bold mb-4'>Review application</h2>
            <p className='text-sm mb-2'><strong>Phone:</strong> {selectedApp.phone}</p>
            <p className='text-sm mb-2'><strong>ID number:</strong> {selectedApp.idNumber}</p>
            <p className='text-sm mb-2'><strong>Areas:</strong> {(selectedApp.areasManaged || []).join(', ')}</p>
            {selectedApp.bio && <p className='text-sm mb-2'><strong>Bio:</strong> {selectedApp.bio}</p>}
            {selectedApp.idDocument && (
              <a
                href={selectedApp.idDocument}
                target='_blank'
                rel='noreferrer'
                className='text-teal-600 text-sm underline block mb-4'
              >
                View ID document
              </a>
            )}

            {selectedApp.status === 'pending' && (
              <div className='space-y-3 mt-4'>
                <div className='flex gap-2'>
                  <button
                    disabled={processing === selectedApp._id}
                    onClick={() => handleApprove(selectedApp._id)}
                    className='flex-1 bg-teal-600 text-white py-2 rounded-lg flex items-center justify-center gap-2'
                  >
                    <Check size={16} /> Approve
                  </button>
                </div>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder='Rejection reason (required to reject)'
                  className='w-full border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600'
                  rows={2}
                />
                <button
                  disabled={processing === selectedApp._id}
                  onClick={() => handleReject(selectedApp._id)}
                  className='w-full bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2'
                >
                  <X size={16} /> Reject
                </button>
              </div>
            )}
            <button onClick={() => setSelectedApp(null)} className='mt-4 text-sm text-gray-500 w-full'>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
