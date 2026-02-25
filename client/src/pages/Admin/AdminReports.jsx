import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';

const AdminReports = () => {
  const { axios, getToken } = useAppContext();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionNote, setActionNote] = useState('');
  const [activeReport, setActiveReport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`/api/reports/all?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setReports(data.reports);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId, status) => {
    if (!actionNote.trim()) { toast.error('Please enter an action note'); return; }
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/reports/update-status', {
        reportId, status,
        actionTaken: actionNote,
        adminNotes: actionNote
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        toast.success('Report updated');
        setActionNote('');
        setActiveReport(null);
        fetchReports();
      } else toast.error(data.message);
    } catch (error) { toast.error(error.message); }
  };

  const reasonLabels = {
    fake_listing: 'Fake Listing',
    already_taken: 'Already Taken',
    payment_outside: 'Payment Outside Platform',
    harassment: 'Harassment',
    spam: 'Spam',
    other: 'Other'
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Reports Management</h1>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['pending', 'reviewed', 'resolved', 'dismissed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg font-medium text-sm ${filter === status ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading reports...</p>
      ) : reports.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No {filter} reports</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report._id} className="bg-white rounded-lg border border-gray-200 p-4 md:p-5">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                <div>
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                    {reasonLabels[report.reason]}
                  </span>
                  <p className="text-sm text-gray-500 mt-2">
                    Reported by: {report.reportedBy?.username} ({report.reportedBy?.email})
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(report.createdAt).toLocaleString()}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium self-start ${
                  report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {report.status}
                </span>
              </div>

              <div className="mb-3">
                <p className="text-sm font-medium mb-1">Description:</p>
                <p className="text-gray-700 text-sm">{report.description}</p>
              </div>

              {/* Link to reported listing if available */}
              {report.propertyId && (
                <a
                  href={`/rooms/${report.propertyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs font-medium mb-3"
                >
                  View Reported Listing ↗
                </a>
              )}

              {report.reportedUserId && (
                <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Reported user:</span> {report.reportedUserId?.username}
                </div>
              )}

              {/* Admin notes if already resolved */}
              {report.adminNotes && (
                <div className="mb-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  <span className="font-semibold">Action taken:</span> {report.adminNotes}
                </div>
              )}

              {report.status === 'pending' && (
                activeReport === report._id ? (
                  <div className="space-y-2">
                    <textarea
                      value={actionNote}
                      onChange={e => setActionNote(e.target.value)}
                      placeholder="Describe what action was taken (required)..."
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleUpdateStatus(report._id, 'resolved')}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report._id, 'dismissed')}
                        className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => { setActiveReport(null); setActionNote(''); }}
                        className="px-3 py-1.5 bg-white text-gray-600 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveReport(report._id)}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                  >
                    Take Action
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReports;
