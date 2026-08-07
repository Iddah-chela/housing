import { useEffect, useState } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { useAppContext } from '../context/AppContext';
import { Plus, X, Loader, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BecomeCaretaker() {
  const { axios, getToken, navigate, user, authLoading, isCaretaker } = useAppContext();
  const { openSignUp } = useClerk();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [areas, setAreas] = useState([]);
  const [areaInput, setAreaInput] = useState('');
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [formData, setFormData] = useState({
    phone: '',
    idNumber: '',
    yearsExperience: '',
    bio: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    if (isCaretaker) {
      navigate('/managed-properties');
      return;
    }
    checkApplicationStatus();
  }, [authLoading, user, navigate, isCaretaker]);

  const checkApplicationStatus = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await axios.get('/api/caretaker-applications/my-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApplicationStatus(res.data);
      if (res.data?.isCaretakerByRole) {
        navigate('/managed-properties');
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddArea = () => {
    if (areaInput.trim() && !areas.includes(areaInput.trim())) {
      setAreas([...areas, areaInput.trim()]);
      setAreaInput('');
    }
  };

  const handleRemoveArea = (index) => {
    setAreas(areas.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.phone?.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!formData.idNumber?.trim()) {
      toast.error('ID / Passport number is required');
      return;
    }
    if (!idFile) {
      toast.error('Please upload a photo of your National ID or Passport');
      return;
    }
    if (!formData.yearsExperience && formData.yearsExperience !== 0) {
      toast.error('Please enter years of experience');
      return;
    }
    if (areas.length === 0) {
      toast.error('Add at least one area you manage');
      return;
    }

    try {
      setSubmitting(true);
      const token = await getToken();
      const body = new FormData();
      body.append('phone', formData.phone.trim());
      body.append('idNumber', formData.idNumber.trim());
      body.append('yearsExperience', String(formData.yearsExperience));
      body.append('areasManaged', JSON.stringify(areas));
      body.append('bio', formData.bio || '');
      body.append('idDocument', idFile);

      const res = await axios.post('/api/caretaker-applications/apply', body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(res.data.message);
      checkApplicationStatus();
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error(error.response?.data?.message);
        setTimeout(() => navigate('/managed-properties'), 1500);
        return;
      }
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader className='animate-spin' size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className='max-w-2xl mx-auto p-6 md:p-8 mt-20'>
        <div className='bg-white dark:bg-gray-800 rounded-lg p-8 shadow border border-gray-200 dark:border-gray-700 text-center'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Become a Caretaker</h1>
          <p className='text-gray-600 dark:text-gray-400 mt-3'>
            Sign in or create an account to apply. You do not need the landlord&apos;s email.
          </p>
          <button
            onClick={() => openSignUp({ redirectUrl: '/become-caretaker' })}
            className='mt-6 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors'
          >
            Sign up to apply
          </button>
        </div>
      </div>
    );
  }

  if (applicationStatus?.status === 'approved') {
    return (
      <div className='max-w-2xl mx-auto p-6 md:p-8 mt-20'>
        <div className='bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-8 text-center'>
          <h1 className='text-2xl font-bold text-green-900 dark:text-green-200 mb-2'>
            You&apos;re an approved caretaker
          </h1>
          <p className='text-green-800 dark:text-green-300 mb-6'>
            List houses you manage, or request to manage ones already on PataKeja.
          </p>
          <button
            onClick={() => navigate('/managed-properties')}
            className='bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors'
          >
            Open Manage Houses
          </button>
        </div>
      </div>
    );
  }

  if (applicationStatus?.status === 'pending') {
    return (
      <div className='max-w-2xl mx-auto p-6 md:p-8 mt-20'>
        <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-8 text-center'>
          <h1 className='text-2xl font-bold text-blue-900 dark:text-blue-200 mb-2'>
            Application under review
          </h1>
          <p className='text-blue-800 dark:text-blue-300'>
            We&apos;ll email and notify you when you&apos;re approved. Then you can list and manage houses.
          </p>
        </div>
      </div>
    );
  }

  if (applicationStatus?.status === 'rejected') {
    return (
      <div className='max-w-2xl mx-auto p-6 md:p-8 mt-20'>
        <div className='bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-8'>
          <div className='flex gap-4 mb-4'>
            <AlertCircle className='text-red-600 flex-shrink-0' size={24} />
            <div>
              <h1 className='text-xl font-bold text-red-900 dark:text-red-200 mb-2'>
                Application not approved
              </h1>
              <p className='text-red-800 dark:text-red-300 mb-4'>
                {applicationStatus.application?.rejectionReason ||
                  applicationStatus.rejectionReason ||
                  'Your application did not meet our requirements at this time.'}
              </p>
              <button
                onClick={() => setApplicationStatus(null)}
                className='text-red-600 hover:text-red-700 font-semibold'
              >
                Reapply
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-2xl mx-auto p-6 md:p-8 mt-16'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Become a Caretaker</h1>
        <p className='text-gray-600 dark:text-gray-400 mt-2'>
          Manage houses on behalf of landlords — even if they are not on PataKeja yet. No landlord email needed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className='bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 shadow space-y-6'>
        <div>
          <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'>Phone number *</label>
          <input
            type='tel'
            name='phone'
            placeholder='07xx xxx xxx'
            value={formData.phone}
            onChange={handleInputChange}
            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg'
            required
          />
        </div>

        <div>
          <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'>National ID / Passport number *</label>
          <input
            type='text'
            name='idNumber'
            value={formData.idNumber}
            onChange={handleInputChange}
            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg'
            required
          />
        </div>

        <div>
          <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'>ID / Passport photo *</label>
          <input
            type='file'
            accept='image/*,.pdf'
            onChange={(e) => setIdFile(e.target.files?.[0] || null)}
            className='w-full text-sm text-gray-600 dark:text-gray-300'
            required
          />
          <p className='text-xs text-gray-500 mt-1'>Clear photo of your ID or passport</p>
        </div>

        <div>
          <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'>Years managing houses *</label>
          <input
            type='number'
            name='yearsExperience'
            min='0'
            value={formData.yearsExperience}
            onChange={handleInputChange}
            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg'
            required
          />
        </div>

        <div>
          <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'>Areas you manage *</label>
          <div className='flex gap-2 mb-3'>
            <input
              type='text'
              placeholder='e.g. Gate A, Madaraka'
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddArea();
                }
              }}
              className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg'
            />
            <button type='button' onClick={handleAddArea} className='bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-1'>
              <Plus size={18} /> Add
            </button>
          </div>
          {areas.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {areas.map((area, index) => (
                <div key={area} className='bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-3 py-1 rounded-full flex items-center gap-2 text-sm'>
                  {area}
                  <button type='button' onClick={() => handleRemoveArea(index)} className='hover:text-red-600'>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'>About you (optional)</label>
          <textarea
            name='bio'
            rows={3}
            maxLength={500}
            value={formData.bio}
            onChange={handleInputChange}
            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg'
            placeholder='How long have you been a caretaker? Which compounds?'
          />
        </div>

        <button
          type='submit'
          disabled={submitting}
          className='w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2'
        >
          {submitting && <Loader size={18} className='animate-spin' />}
          {submitting ? 'Submitting...' : 'Submit application'}
        </button>
        <p className='text-xs text-gray-500 text-center'>We usually review within 24–48 hours</p>
      </form>
    </div>
  );
}
