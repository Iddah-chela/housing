import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';
import { Check, Plus, ArrowRightLeft } from 'lucide-react';
import PropertyListingModal from '../../components/PropertyListingModal';

const AdminListings = () => {
  const { axios, getToken } = useAppContext();
  const [activeTab, setActiveTab] = useState('listings');
  const [properties, setProperties] = useState([]);
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimStatusFilter, setClaimStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null); // property being transferred
  const [transferEmail, setTransferEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [claimActionBusy, setClaimActionBusy] = useState(null);
  const [promoteBusy, setPromoteBusy] = useState(null);
  const [resetBusy, setResetBusy] = useState(null);

  useEffect(() => { fetchProperties(); }, []);
  useEffect(() => {
    if (activeTab === 'claims') fetchClaims(claimStatusFilter);
  }, [activeTab, claimStatusFilter]);

  const fetchProperties = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/admin/properties', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) setProperties(data.properties);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClaims = async (status = 'pending') => {
    try {
      setClaimsLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/admin/claims', {
        params: { status },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) setClaims(data.claims || []);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setClaimsLoading(false);
    }
  };

  const handleDelist = async (propertyId) => {
    if (!confirm('Delist this property? It will be hidden from all listings.')) return;
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/admin/delist-property', { propertyId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) { toast.success(data.message); fetchProperties(); }
      else toast.error(data.message);
    } catch (error) { toast.error(error.message); }
  };

  const handleRelist = async (propertyId) => {
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/admin/relist-property', { propertyId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) { toast.success(data.message); fetchProperties(); }
      else toast.error(data.message);
    } catch (error) { toast.error(error.message); }
  };

  const handleVerify = async (propertyId) => {
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/admin/verify-property', { propertyId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) { toast.success(data.message); fetchProperties(); }
      else toast.error(data.message);
    } catch (error) { toast.error(error.message); }
  };

  const handleUnverify = async (propertyId) => {
    if (!confirm('Remove verification from this property?')) return;
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/admin/unverify-property', { propertyId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) { toast.success(data.message); fetchProperties(); }
      else toast.error(data.message);
    } catch (error) { toast.error(error.message); }
  };

  const handleTransfer = async () => {
    if (!transferEmail.trim()) return toast.error('Enter the new owner\'s email');
    setTransferring(true);
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/admin/transfer-property',
        { propertyId: transferTarget._id, newOwnerEmail: transferEmail.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message);
        setTransferTarget(null);
        setTransferEmail('');
        fetchProperties();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setTransferring(false);
    }
  };

  const handlePromoteToLive = async (propertyId) => {
    setPromoteBusy(propertyId);
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/admin/promote-live', { propertyId }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        toast.success(data.message || 'Listing promoted to live');
        fetchProperties();
        return;
      }

      if (Array.isArray(data?.missing) && data.missing.length) {
        toast.error(`Not ready: ${data.missing.join(', ')}`);
      } else {
        toast.error(data.message || 'Could not promote listing');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPromoteBusy(null);
    }
  };

  const handleResetClaimState = async (propertyId) => {
    if (!confirm('Reset this listing back to unclaimed and remove assigned caretakers?')) return;
    setResetBusy(propertyId);
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/admin/reset-claim-state', {
        propertyId,
        removeCaretakers: true,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        toast.success(data.message || 'Listing reset to unclaimed');
        fetchProperties();
      } else {
        toast.error(data.message || 'Could not reset claim state');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResetBusy(null);
    }
  };

  const approveClaim = async (claimId) => {
    setClaimActionBusy(claimId);
    try {
      const token = await getToken();
      const note = window.prompt('Optional admin note for approval:', '') || '';
      const { data } = await axios.post(`/api/admin/claims/${claimId}/approve`,
        { reviewNote: note },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message || 'Claim approved');
        fetchClaims(claimStatusFilter);
        fetchProperties();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setClaimActionBusy(null);
    }
  };

  const rejectClaim = async (claimId) => {
    const note = window.prompt('Reason for rejection (required):', 'Insufficient proof provided');
    if (!note || !note.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    setClaimActionBusy(claimId);
    try {
      const token = await getToken();
      const { data } = await axios.post(`/api/admin/claims/${claimId}/reject`,
        { reviewNote: note.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message || 'Claim rejected');
        fetchClaims(claimStatusFilter);
        fetchProperties();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setClaimActionBusy(null);
    }
  };

  const filtered = properties.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.estate?.toLowerCase().includes(q) ||
      p.place?.toLowerCase().includes(q) ||
      p.owner?.email?.toLowerCase().includes(q)
    );
  });

  const getDisplayRoomCount = (property) => {
    const fromGrid = Number(property?.totalRooms || 0);
    const fromDeclared = Number(property?.declaredUnits || 0);
    return fromGrid > 0 ? fromGrid : (fromDeclared > 0 ? fromDeclared : 0);
  };

  const getLandlordContact = (property) => {
    return String(property?.whatsappNumber || property?.contact || property?.claimPhone || '').trim();
  };

  const getPhoneHref = (property) => {
    const digits = getLandlordContact(property).replace(/[^0-9+]/g, '');
    return digits ? `tel:${digits}` : '';
  };

  const getWhatsAppHref = (property) => {
    let digits = getLandlordContact(property).replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('0')) digits = `254${digits.slice(1)}`;
    if (digits.length < 9) return '';
    return `https://wa.me/${digits}`;
  };

  return (
    <div className="p-4 md:p-8">
      {showAddModal && (
        <PropertyListingModal
          onClose={() => { setShowAddModal(false); fetchProperties(); }}
        />
      )}

      {/* Transfer to Owner Modal */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-1">Transfer Property Ownership</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Transfer <span className="font-medium text-gray-700 dark:text-gray-200">{transferTarget.name}</span> to its real owner.
              They just need to have a PataKeja account — they will automatically be upgraded to house owner.
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Owner's Email</label>
            <input
              type="email"
              value={transferEmail}
              onChange={e => setTransferEmail(e.target.value)}
              placeholder="houseowner@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setTransferTarget(null); setTransferEmail(''); }}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={transferring}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-60"
              >
                {transferring ? 'Transferring...' : 'Transfer Ownership'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold">Listings Management</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">{activeTab === 'listings' ? `${filtered.length} properties` : `${claims.length} claims`}</div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={activeTab !== 'listings'}
            className={`flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'listings' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Listing
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activeTab === 'listings' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
        >
          Listings
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activeTab === 'claims' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
        >
          Claims Queue
        </button>
      </div>

      {activeTab === 'listings' && (
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, estate, location, or owner email..."
          className="w-full mb-6 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
        />
      )}

      {activeTab === 'claims' && (
        <div className="mb-6 flex items-center gap-2">
          {['pending', 'approved', 'rejected', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setClaimStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${claimStatusFilter === status ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'listings' && (loading ? (
        <p>Loading listings...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center text-gray-500">No properties found</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((property) => (
            <div key={property._id} className={`bg-white dark:bg-gray-800 rounded-lg border p-4 md:p-5 ${property.isExpired ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className="flex flex-col sm:flex-row gap-4">
                {property.images?.[0] && (
                  <img src={property.images[0]} alt="" className="w-full sm:w-28 h-24 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div>
                      <h3 className="font-semibold text-lg leading-tight">{property.name}</h3>
                      <p className="text-gray-500 text-sm">{property.estate}, {property.place}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{property.propertyType}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {property.isVerified && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium flex items-center gap-0.5"><Check className='w-3 h-3' /> Verified</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${property.isExpired ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>
                        {property.isExpired ? 'Delisted' : 'Live'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        property.listingTier === 'live'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : property.listingTier === 'claimed'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}>
                        {property.listingTier === 'live' ? 'Live Tier' : property.listingTier === 'claimed' ? 'Owner Updating' : 'Partner Listing'}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium">
                        {property.vacantRooms ?? 0} vacant
                      </span>
                      {property.listingTier === 'live' && property.isVerified && property.owner?.role === 'admin' && !property.isClaimed && (!property.caretakers || property.caretakers.length === 0) && (
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                          Verified by Admin
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <img src={property.owner?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(property.owner?.username || 'U')}&background=6366f1&color=fff&bold=true&size=40`} alt="" className="w-5 h-5 rounded-full" onError={(e) => { const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(property.owner?.username || 'U')}&background=6366f1&color=fff&bold=true&size=40`; if (e.target.src !== fb) e.target.src = fb }} />
                    <span>{property.owner?.username || 'Unknown'} · {property.owner?.email}</span>
                    {property.landlordName && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium ml-1">
                        House Owner: {property.landlordName}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">{property.buildings?.length ?? 0} buildings</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">{getDisplayRoomCount(property)} rooms</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">{property.createdAt ? new Date(property.createdAt).toLocaleDateString() : ''}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <a href={`/rooms/${property._id}`} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700">
                      View Listing ↗
                    </a>
                    {!property.isVerified ? (
                      <button onClick={() => handleVerify(property._id)}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700">
                        Verify
                      </button>
                    ) : (
                      <button onClick={() => handleUnverify(property._id)}
                        className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs hover:bg-yellow-600">
                        Unverify
                      </button>
                    )}
                    {property.isExpired ? (
                      <button onClick={() => handleRelist(property._id)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">
                        Re-list
                      </button>
                    ) : (
                      <button onClick={() => handleDelist(property._id)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700">
                        Delist
                      </button>
                    )}
                    <button onClick={() => { setTransferTarget(property); setTransferEmail(''); }}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700 flex items-center gap-1">
                      <ArrowRightLeft className="w-3 h-3" />
                      Transfer to Owner
                    </button>
                    {getPhoneHref(property) && (
                      <a
                        href={getPhoneHref(property)}
                        className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs hover:bg-slate-800"
                      >
                        Contact Landlord
                      </a>
                    )}
                    {getWhatsAppHref(property) && (
                      <a
                        href={getWhatsAppHref(property)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs hover:bg-emerald-800"
                      >
                        WhatsApp Landlord
                      </a>
                    )}
                    {property.listingTier !== 'live' && (
                      <button
                        onClick={() => handlePromoteToLive(property._id)}
                        disabled={promoteBusy === property._id}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {promoteBusy === property._id ? 'Promoting...' : 'Promote (Override)'}
                      </button>
                    )}
                    {(property.isClaimed || property.claimStatus !== 'none') && (
                      <button
                        onClick={() => handleResetClaimState(property._id)}
                        disabled={resetBusy === property._id}
                        className="px-3 py-1.5 bg-rose-700 text-white rounded-lg text-xs hover:bg-rose-800 disabled:opacity-60"
                      >
                        {resetBusy === property._id ? 'Resetting...' : 'Reset to Unclaimed'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {activeTab === 'claims' && (
        claimsLoading ? (
          <p>Loading claims...</p>
        ) : claims.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center text-gray-500">No claims found</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {claims.map((claim) => (
              <div key={claim._id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-base">{claim.property?.name || 'Listing'}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{claim.property?.estate}, {claim.property?.place}</p>
                    <p className="text-sm mt-2">Claimant: <span className="font-medium">{claim.claimantName}</span> ({claim.claimRole})</p>
                    <p className="text-xs text-gray-500">{claim.claimantEmail}{claim.claimPhone ? ` · ${claim.claimPhone}` : ''}</p>
                    {claim.claimNotes && <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">{claim.claimNotes}</p>}
                    {claim.evidenceUrls?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {claim.evidenceUrls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 text-xs rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          >
                            Evidence {idx + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      claim.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      claim.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {claim.status}
                    </span>
                    <span className="text-[11px] text-gray-400">{new Date(claim.createdAt).toLocaleString()}</span>
                    {claim.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveClaim(claim._id)}
                          disabled={claimActionBusy === claim._id}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs rounded-lg"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectClaim(claim._id)}
                          disabled={claimActionBusy === claim._id}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs rounded-lg"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default AdminListings;
