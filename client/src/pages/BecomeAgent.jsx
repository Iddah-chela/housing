import { useEffect, useState } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { useAppContext } from '../context/AppContext';
import { ChevronLeft, Plus, X, Loader, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BecomeAgent() {
  const { axios, getToken, navigate, user, authLoading, isAgent } = useAppContext();
  const { openSignUp } = useClerk();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [areas, setAreas] = useState([]);
  const [areaInput, setAreaInput] = useState('');
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [formData, setFormData] = useState({
    yearsExperience: '',
    referenceLink: '',
    bio: '',
  });

  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    if (!user) {
      setLoading(false);
      return;
    }
    // If user is already an agent, redirect to agent dashboard
    if (isAgent) {
      navigate('/agent');
      return;
    }
    checkApplicationStatus();
  }, [authLoading, user, navigate, isAgent]);

  const checkApplicationStatus = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await axios.get('/api/agent-applications/my-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApplicationStatus(res.data);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

    if (!formData.yearsExperience) {
      toast.error('Please enter years of experience');
      return;
    }

    if (areas.length === 0) {
      toast.error('Please add at least one service area');
      return;
    }

    try {
      setSubmitting(true);
      const token = await getToken();
      const res = await axios.post(
        '/api/agent-applications/apply',
        {
          yearsExperience: parseInt(formData.yearsExperience),
          areasServed: areas,
          referenceLink: formData.referenceLink,
          bio: formData.bio,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(res.data.message);
      checkApplicationStatus();
    } catch (error) {
      console.error('Error submitting application:', error);
      
      // If 409 (conflict), user is already an agent
      if (error.response?.status === 409) {
        toast.error(error.response?.data?.message);
        // Refresh user and redirect to agent dashboard
        setTimeout(() => navigate('/agent'), 1500);
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
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Become an Agent</h1>
          <p className='text-gray-600 dark:text-gray-400 mt-3'>
            Sign in or create an account to apply for agent access.
          </p>
          <button
            onClick={() => openSignUp({ redirectUrl: '/become-agent' })}
            className='mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors'
          >
            Sign up to apply
          </button>
        </div>
      </div>
    );
  }

  // If already approved, show success message
  if (applicationStatus?.status === 'approved') {
    return (
      <div className='max-w-2xl mx-auto p-6 md:p-8 mt-20'>
        <div className='bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-8 text-center'>
          <div className='text-4xl mb-4'>🎉</div>
          <h1 className='text-2xl font-bold text-green-900 dark:text-green-200 mb-2'>
            Welcome to the Agent Program!
          </h1>
          <p className='text-green-800 dark:text-green-300 mb-6'>
            Your application has been approved. You can now access the agent dashboard.
          </p>
          <button
            onClick={() => navigate('/agent')}
            className='bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors'
          >
            Go to Agent Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If pending, show pending message
  if (applicationStatus?.status === 'pending') {
    return (
      <div className='max-w-2xl mx-auto p-6 md:p-8 mt-20'>
        <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-8 text-center'>
          <div className='text-4xl mb-4'>⏳</div>
          <h1 className='text-2xl font-bold text-blue-900 dark:text-blue-200 mb-2'>
            Application Under Review
          </h1>
          <p className='text-blue-800 dark:text-blue-300'>
            Your application is being reviewed. You’ll get an email and an in-app notification when it’s approved — then an Agent Dashboard button will appear in the menu.
          </p>
        </div>
      </div>
    );
  }

  // If rejected, show rejection message with option to reapply
  if (applicationStatus?.status === 'rejected') {
    return (
      <div className='max-w-2xl mx-auto p-6 md:p-8 mt-20'>
        <div className='bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-8'>
          <div className='flex gap-4 mb-4'>
            <AlertCircle className='text-red-600 flex-shrink-0' size={24} />
            <div>
              <h1 className='text-xl font-bold text-red-900 dark:text-red-200 mb-2'>
                Application Not Approved
              </h1>
              <p className='text-red-800 dark:text-red-300 mb-4'>
                {applicationStatus.application?.rejectionReason ||
                  'Your application did not meet our requirements at this time.'}
              </p>
              <button
                onClick={() => {
                  setApplicationStatus(null);
                }}
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

  // Show application form if no application exists
  return (
    <div className='max-w-2xl mx-auto p-6 md:p-8'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Become an Agent</h1>
        <p className='text-gray-600 dark:text-gray-400 mt-2'>
          Unlock the power to post vacancies and connect with renters
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className='bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 shadow'>
        {/* Experience */}
        <div className='mb-8'>
          <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3'>
            Years of Experience in Real Estate
          </label>
          <input
            type='number'
            name='yearsExperience'
            placeholder='e.g., 5'
            value={formData.yearsExperience}
            onChange={handleInputChange}
            min='0'
            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
            required
          />
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>Tell us about your experience</p>
        </div>

        {/* Service Areas */}
        <div className='mb-8'>
          <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3'>
            Areas You Serve
          </label>
          <div className='flex gap-2 mb-4'>
            <input
              type='text'
              placeholder='Add area (e.g., Westlands, Karen)'
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddArea();
                }
              }}
              className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
            />
            <button
              type='button'
              onClick={handleAddArea}
              className='bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors'
            >
              <Plus size={18} />
              Add
            </button>
          </div>

          {areas.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {areas.map((area, index) => (
                <div
                  key={index}
                  className='bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full flex items-center gap-2'
                >
                  {area}
                  <button
                    type='button'
                    onClick={() => handleRemoveArea(index)}
                    className='hover:text-red-600'
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-3'>Add at least one area where you operate</p>
        </div>

        {/* Reference Link */}
        <div className='mb-8'>
          <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3'>
            Reference Link (optional)
          </label>
          <input
            type='url'
            name='referenceLink'
            placeholder='Portfolio, LinkedIn, or website'
            value={formData.referenceLink}
            onChange={handleInputChange}
            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
          />
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>Help us verify your credentials</p>
        </div>

        {/* Bio */}
        <div className='mb-8'>
          <label className='block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3'>
            About You
          </label>
          <textarea
            name='bio'
            placeholder='Tell us a bit about yourself and your experience...'
            value={formData.bio}
            onChange={handleInputChange}
            rows='4'
            maxLength='500'
            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
          />
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
            {formData.bio.length}/500 characters
          </p>
        </div>

        {/* Submit */}
        <button
          type='submit'
          disabled={submitting}
          className='w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
        >
          {submitting && <Loader size={18} className='animate-spin' />}
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>

        <p className='text-xs text-gray-500 dark:text-gray-400 text-center mt-4'>
          We review applications within 24-48 hours
        </p>
      </form>
    </div>
  );
}
