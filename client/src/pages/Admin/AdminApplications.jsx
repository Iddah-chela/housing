import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const AdminApplications = () => {
  const { axios, getToken } = useAppContext();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
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
    if (!confirm('Are you sure you want to approve this application? The user will become a landlord.')) {
      return;
    }

    try {
      const token = await getToken();
      const { data } = await axios.put(
        `/api/landlord-application/approve/${applicationId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        fetchApplications();
        setSelectedApplication(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve application');
    }
  };

  const handleReject = async (applicationId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const token = await getToken();
      const { data } = await axios.put(
        `/api/landlord-application/reject/${applicationId}`,
        { reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        fetchApplications();
        setSelectedApplication(null);
        setRejectionReason('');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject application');
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
    return <div className="p-8">Loading applications...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Landlord Applications</h1>
        <p className="text-gray-600">Review and manage landlord applications</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg ${filter === 'pending' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
        >
          Pending ({applications.filter(a => a.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg ${filter === 'approved' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg ${filter === 'rejected' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
        >
          Rejected
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
        >
          All
        </button>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No applications found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
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
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((app) => (
                <tr key={app._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img 
                          className="h-10 w-10 rounded-full" 
                          src={app.userId?.image || 'https://avatar.iran.liara.run/public'} 
                          alt="" 
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
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
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
                  ✕
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
                    <a 
                      href={selectedApplication.idDocument} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      View ID Document →
                    </a>
                  </div>
                  {selectedApplication.ownershipProof && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Ownership Proof</p>
                      <a 
                        href={selectedApplication.ownershipProof} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        View Ownership Proof →
                      </a>
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
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-all font-medium"
                    >
                      ✓ Approve Application
                    </button>
                    
                    <div className="flex-1">
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter rejection reason..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
                        rows="2"
                      />
                      <button
                        onClick={() => handleReject(selectedApplication._id)}
                        className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-all font-medium"
                      >
                        ✗ Reject Application
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
