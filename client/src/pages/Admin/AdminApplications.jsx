import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import { X, Check, XCircle } from 'lucide-react';

const AdminApplications = () => {
  const { axios, getToken } = useAppContext();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Open a document — handles both Cloudinary URLs and base64 data: URLs
  const openDocument = (url) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      // Convert base64 data URL to a blob and open
      try {
        const [header, base64] = url.split(',');
        const mimeType = header.match(/:(.*?);/)[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        // Revoke after a short delay to free memory
        if (win) setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } catch (e) {
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Returns true if a URL represents an image
  const isImageUrl = (url) => {
    if (!url) return false;
    if (url.startsWith('data:image/')) return true;
    return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(url.split('?')[0]);
  };

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const url = filter === 'all'
        ? '/api/landlord-application/all'
        : `/api/landlord-application/all?status=${filter}`;

      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setApplications(data.applications);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId) => {
    if (!confirm('Are you sure you want to approve this application? The user will become a house owner.')) {
      return;
    }

    setActionLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.put(
        `/api/landlord-application/approve/${applicationId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        setSelectedApplication(null);
        fetchApplications();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (applicationId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.put(
        `/api/landlord-application/reject/${applicationId}`,
        { reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        setSelectedApplication(null);
        setRejectionReason('');
        fetchApplications();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject application');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-gray-500">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading applications...</span>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">House Owner Applications</h1>
        <p className="text-gray-600">Review and manage house owner applications</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg ${filter === 'pending' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}
        >
          Pending ({applications.filter(a => a.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg ${filter === 'approved' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg ${filter === 'rejected' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}
        >
          Rejected
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}
        >
          All
        </button>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No applications found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Properties
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {applications.map((app) => (
                <tr key={app._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img 
                          className="h-10 w-10 rounded-full" 
                          src={app.userId?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.fullName || 'U')}&background=6366f1&color=fff&bold=true`} 
                          alt="" 
                          onError={(e) => { const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.fullName || 'U')}&background=6366f1&color=fff&bold=true`; if (e.target.src !== fb) e.target.src = fb }}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {app.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {app.userId?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{app.phoneNumber}</div>
                    <div className="text-sm text-gray-500">ID: {app.idNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{app.numberOfProperties} properties</div>
                    <div className="text-sm text-gray-500">{app.totalRooms} total rooms</div>
                    <div className="text-sm text-gray-500">{app.propertiesLocation}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(app.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedApplication(app)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Application Details Modal */}
      {selectedApplication && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedApplication(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Application Details
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Submitted on {new Date(selectedApplication.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Applicant Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Applicant Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium">{selectedApplication.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone Number</p>
                    <p className="font-medium">{selectedApplication.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ID/Passport Number</p>
                    <p className="font-medium">{selectedApplication.idNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedApplication.userId?.email}</p>
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Property Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Number of Properties</p>
                    <p className="font-medium">{selectedApplication.numberOfProperties}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Rooms</p>
                    <p className="font-medium">{selectedApplication.totalRooms}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{selectedApplication.propertiesLocation}</p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Documents</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">ID Document</p>
                    {isImageUrl(selectedApplication.idDocument) ? (
                      <div>
                        <img
                          src={selectedApplication.idDocument}
                          alt="ID Document"
                          className="w-full max-h-48 object-contain rounded border border-gray-200 mb-1 cursor-pointer"
                          onClick={() => openDocument(selectedApplication.idDocument)}
                        />
                        <button onClick={() => openDocument(selectedApplication.idDocument)} className="text-xs text-indigo-600 hover:underline">
                          Open full size →
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openDocument(selectedApplication.idDocument)}
                        className="text-indigo-600 hover:underline text-sm"
                      >
                        View ID Document →
                      </button>
                    )}
                  </div>
                  {selectedApplication.ownershipProof && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Ownership Proof</p>
                      {isImageUrl(selectedApplication.ownershipProof) ? (
                        <div>
                          <img
                            src={selectedApplication.ownershipProof}
                            alt="Ownership Proof"
                            className="w-full max-h-48 object-contain rounded border border-gray-200 mb-1 cursor-pointer"
                            onClick={() => openDocument(selectedApplication.ownershipProof)}
                          />
                          <button onClick={() => openDocument(selectedApplication.ownershipProof)} className="text-xs text-indigo-600 hover:underline">
                            Open full size →
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openDocument(selectedApplication.ownershipProof)}
                          className="text-indigo-600 hover:underline text-sm"
                        >
                          View Ownership Proof →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedApplication.notes && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Additional Notes</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {selectedApplication.notes}
                  </p>
                </div>
              )}

              {/* Status */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Status</h3>
                {getStatusBadge(selectedApplication.status)}
                {selectedApplication.status === 'rejected' && (
                  <div className="mt-3 bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Rejection Reason:</strong> {selectedApplication.rejectionReason}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedApplication.status === 'pending' && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold mb-4">Review Application</h3>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleApprove(selectedApplication._id)}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className='flex items-center justify-center gap-1'>
                        {actionLoading ? 'Processing...' : <><Check className='w-4 h-4' /> Approve Application</>}
                      </span>
                    </button>
                    
                    <div className="flex-1">
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter rejection reason..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
                        rows="2"
                        disabled={actionLoading}
                      />
                      <button
                        onClick={() => handleReject(selectedApplication._id)}
                        disabled={actionLoading}
                        className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <span className='flex items-center justify-center gap-1'>
                          {actionLoading ? 'Processing...' : <><XCircle className='w-4 h-4' /> Reject Application</>}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplications;
