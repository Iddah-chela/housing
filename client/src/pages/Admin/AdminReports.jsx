import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Ban, Trash2, ShieldOff, Eye, ExternalLink, UserCheck, Send, ChevronDown, ChevronUp, Download, FileSpreadsheet } from 'lucide-react';

const AdminReports = () => {
  const { axios, getToken } = useAppContext();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [expandedReport, setExpandedReport] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [reportDataset, setReportDataset] = useState('bookings');
  const [reportFormat, setReportFormat] = useState('xlsx');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const downloadReport = async () => {
    setExportLoading(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      params.set('dataset', reportDataset);
      params.set('format', reportFormat);
      if (reportFrom) params.set('from', reportFrom);
      if (reportTo) params.set('to', reportTo);

      const { data } = await axios.get(`/api/admin/reports/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blob = new Blob([data], {
        type: reportFormat === 'csv'
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `patakeja-${reportDataset}-report.${reportFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (error) {
      toast.error('Could not generate report');
    } finally {
      setExportLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.get(`/api/reports/all${filter ? `?status=${filter}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) setReports(data.reports);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const doAction = async (url, body, successMsg) => {
    setActionLoading(body.reportId || body.userId || body.listingId);
    try {
      const token = await getToken();
      const { data } = await axios.post(url, body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        toast.success(data.message || successMsg);
        fetchReports();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const resolveReport = async (reportId, actionTaken, statusOverride) => {
    try {
      const token = await getToken();
      await axios.post('/api/reports/update-status', {
        reportId,
        status: statusOverride || 'resolved',
        actionTaken,
        adminNotes: adminNotes.trim() || `Action: ${actionTaken}`
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) { /* already toasted */ }
  };

  const handleWarnUser = (report) => {
    if (!report.reportedUserId?._id) { toast.error('No reported user linked'); return; }
    const reason = adminNotes.trim() || report.reason;
    doAction('/api/reports/warn-user', { userId: report.reportedUserId._id, reason }, 'Warning sent');
    resolveReport(report._id, 'warning');
  };

  const handleSuspendUser = (report) => {
    if (!report.reportedUserId?._id) { toast.error('No reported user linked'); return; }
    if (!confirm(`Suspend user ${report.reportedUserId.username}?`)) return;
    const reason = adminNotes.trim() || report.reason;
    doAction('/api/reports/suspend-user', { userId: report.reportedUserId._id, reason }, 'User suspended');
    resolveReport(report._id, 'suspended');
  };

  const handleUnsuspendUser = (report) => {
    if (!report.reportedUserId?._id) return;
    doAction('/api/reports/unsuspend-user', { userId: report.reportedUserId._id }, 'User unsuspended');
  };

  const handleRemoveListing = (report) => {
    if (!report.reportedItemId) { toast.error('No listing ID'); return; }
    const listingType = report.listingInfo?.type || 'property';
    if (!confirm(`Permanently delete this ${listingType}? This cannot be undone.`)) return;
    doAction('/api/reports/remove-listing', { listingId: report.reportedItemId, listingType }, 'Listing removed');
    resolveReport(report._id, 'removed');
  };

  const handleUnverifyListing = (report) => {
    if (!report.reportedItemId) { toast.error('No listing ID'); return; }
    const listingType = report.listingInfo?.type || 'property';
    doAction('/api/reports/unverify-listing', { listingId: report.reportedItemId, listingType }, 'Listing unverified');
    resolveReport(report._id, 'verified');
  };

  const handleDismiss = (report) => {
    resolveReport(report._id, 'none', 'dismissed');
    setTimeout(fetchReports, 500);
  };

  const reasonLabels = {
    fake_listing: 'Fake Listing',
    already_taken: 'Already Taken',
    payment_outside: 'Payment Outside Platform',
    harassment: 'Harassment',
    spam: 'Spam',
    other: 'Other'
  };

  const actionBadge = {
    none: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    suspended: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    removed: 'bg-red-200 dark:bg-red-900/40 text-red-900 dark:text-red-200',
    verified: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
  };

  const statusColors = {
    pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    reviewed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    resolved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    dismissed: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
  };

  const isExpanded = (id) => expandedReport === id;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-semibold mb-2">Reports Management</h1>
      <p className="text-gray-500 text-sm mb-6">Review reports and take enforcement actions</p>

      <div className="mb-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold">Export Activity Report</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Report Type</span>
            <select value={reportDataset} onChange={(e) => setReportDataset(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm">
              <option value="bookings">Bookings</option>
              <option value="logins">Recent Logins</option>
              <option value="users">Users</option>
              <option value="properties">Properties</option>
              <option value="visits">Site Visits</option>
              <option value="reports">Moderation Reports</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Format</span>
            <select value={reportFormat} onChange={(e) => setReportFormat(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm">
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">From</span>
            <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">To</span>
            <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <button onClick={downloadReport} disabled={exportLoading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
            <Download className="w-4 h-4" /> {exportLoading ? 'Generating...' : 'Download Report'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">If you leave dates blank, the last 30 days are used.</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['pending', 'resolved', 'dismissed', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s === 'all' ? '' : s)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              (s === 'all' ? filter === '' : filter === s)
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No {filter || ''} reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report._id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {/* Report header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => { setExpandedReport(isExpanded(report._id) ? null : report._id); setAdminNotes(report.adminNotes || ''); }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs rounded-full font-medium">
                        {reasonLabels[report.reason] || report.reason}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColors[report.status]}`}>
                        {report.status}
                      </span>
                      {report.actionTaken && report.actionTaken !== 'none' && (
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${actionBadge[report.actionTaken]}`}>
                          {report.actionTaken}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {report.reportType === 'listing' ? 'Listing' : 'User'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">{report.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-400">
                      <span>By: {report.reportedBy?.username || 'Unknown'}</span>
                      {report.reportedUserId && (
                        <span>Against: <strong className={report.reportedUserId.isSuspended ? 'text-red-600' : 'text-gray-600'}>
                          {report.reportedUserId.username}{report.reportedUserId.isSuspended ? ' (SUSPENDED)' : ''}
                        </strong></span>
                      )}
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {isExpanded(report._id) ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                </div>
              </div>

              {/* Expanded details + actions */}
              {isExpanded(report._id) && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-4">
                  {/* Full description */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Description</h4>
                    <p className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">{report.description}</p>
                  </div>

                  {/* Reporter + Reported user */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Reporter</h4>
                      <div className="flex items-center gap-2">
                        <img src={report.reportedBy?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reportedBy?.username || 'U')}&background=6366f1&color=fff&bold=true`} alt="" className="w-8 h-8 rounded-full bg-gray-100" onError={(e) => { const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reportedBy?.username || 'U')}&background=6366f1&color=fff&bold=true`; if (e.target.src !== fb) e.target.src = fb }} />
                        <div>
                          <p className="text-sm font-medium">{report.reportedBy?.username}</p>
                          <p className="text-xs text-gray-400">{report.reportedBy?.email}</p>
                        </div>
                      </div>
                    </div>

                    {report.reportedUserId && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Reported User</h4>
                        <div className="flex items-center gap-2">
                          <img src={report.reportedUserId.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reportedUserId.username || 'U')}&background=6366f1&color=fff&bold=true`} alt="" className="w-8 h-8 rounded-full bg-gray-100" onError={(e) => { const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reportedUserId.username || 'U')}&background=6366f1&color=fff&bold=true`; if (e.target.src !== fb) e.target.src = fb }} />
                          <div>
                            <p className="text-sm font-medium">
                              {report.reportedUserId.username}
                              {report.reportedUserId.isSuspended && <span className="ml-2 text-xs text-red-600 font-semibold">SUSPENDED</span>}
                            </p>
                            <p className="text-xs text-gray-400">{report.reportedUserId.email}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Listing info + View link */}
                  {report.reportType === 'listing' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Reported Listing</h4>
                      {report.listingInfo ? (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">
                              {report.listingInfo.type === 'property'
                                ? `${report.listingInfo.name} — ${report.listingInfo.place}, ${report.listingInfo.estate}`
                                : `${report.listingInfo.roomType} — Ksh ${report.listingInfo.pricePerMonth}/mo`
                              }
                            </p>
                            <p className="text-xs text-gray-400">
                              {report.listingInfo.isVerified ? 'Verified' : 'Not verified'}
                              {' · ID: '}{report.reportedItemId}
                            </p>
                          </div>
                          <a
                            href={report.listingInfo.type === 'property'
                              ? `/rooms/${report.reportedItemId}`
                              : `/rooms/${report.reportedItemId}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium bg-indigo-50 px-3 py-1.5 rounded-lg flex-shrink-0"
                          >
                            <Eye className="w-4 h-4" /> View
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Listing ID: {report.reportedItemId} (may have been deleted)</p>
                      )}
                    </div>
                  )}

                  {/* Previous admin notes (on resolved reports) */}
                  {report.adminNotes && report.status !== 'pending' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                      <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1">Admin Notes</h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">{report.adminNotes}</p>
                    </div>
                  )}

                  {/* Action panel — only for pending */}
                  {report.status === 'pending' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Take Action</h4>

                      <textarea
                        value={adminNotes}
                        onChange={e => setAdminNotes(e.target.value)}
                        placeholder="Admin notes (optional)..."
                        rows={2}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                      />

                      <div className="flex flex-wrap gap-2">
                        {/* Warn user */}
                        {report.reportedUserId && (
                          <button
                            onClick={() => handleWarnUser(report)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 transition-all"
                          >
                            <Send className="w-3.5 h-3.5" /> Warn User
                          </button>
                        )}

                        {/* Suspend user */}
                        {report.reportedUserId && !report.reportedUserId.isSuspended && (
                          <button
                            onClick={() => handleSuspendUser(report)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-all"
                          >
                            <Ban className="w-3.5 h-3.5" /> Suspend User
                          </button>
                        )}

                        {/* Unsuspend user */}
                        {report.reportedUserId?.isSuspended && (
                          <button
                            onClick={() => handleUnsuspendUser(report)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-all"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Unsuspend
                          </button>
                        )}

                        {/* Unverify listing */}
                        {report.reportType === 'listing' && report.listingInfo?.isVerified && (
                          <button
                            onClick={() => handleUnverifyListing(report)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-all"
                          >
                            <ShieldOff className="w-3.5 h-3.5" /> Unverify Listing
                          </button>
                        )}

                        {/* Remove listing */}
                        {report.reportType === 'listing' && report.listingInfo && (
                          <button
                            onClick={() => handleRemoveListing(report)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-800 text-white rounded-lg text-sm font-medium hover:bg-red-900 disabled:opacity-50 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Listing
                          </button>
                        )}

                        {/* Dismiss */}
                        <button
                          onClick={() => handleDismiss(report)}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1.5 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-all ml-auto"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReports;
