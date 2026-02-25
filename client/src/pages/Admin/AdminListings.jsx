import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';

const AdminListings = () => {
  const { axios, getToken } = useAppContext();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchProperties(); }, []);

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

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold">Listings Management</h1>
        <div className="text-sm text-gray-500">{filtered.length} properties</div>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, estate, location, or owner email..."
        className="w-full mb-6 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {loading ? (
        <p>Loading listings...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">No properties found</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((property) => (
            <div key={property._id} className={`bg-white rounded-lg border p-4 md:p-5 ${property.isExpired ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
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
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">✓ Verified</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${property.isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {property.isExpired ? 'Delisted' : 'Live'}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                        {property.vacantRooms ?? 0} vacant
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <img src={property.owner?.image || 'https://avatar.iran.liara.run/public'} alt="" className="w-5 h-5 rounded-full" />
                    <span>{property.owner?.username || 'Unknown'} · {property.owner?.email}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-gray-100 rounded">{property.buildings?.length ?? 0} buildings</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">{property.totalRooms ?? 0} rooms</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">{property.createdAt ? new Date(property.createdAt).toLocaleDateString() : ''}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <a href={`/rooms/${property._id}`} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50">
                      View Listing ↗
                    </a>
                    {!property.isVerified && (
                      <button onClick={() => handleVerify(property._id)}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700">
                        Verify
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
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminListings;
