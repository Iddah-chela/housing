import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';
import { Megaphone, Bell, Mail, LayoutTemplate, Image as ImageIcon, PencilLine, Trash2, Plus, Send, Users, UserCheck, Shield, UserCog } from 'lucide-react';

const defaultForm = {
  title: '',
  body: '',
  audience: 'all',
  recipientTokens: '',
  channels: ['inApp', 'banner'],
  bannerStyle: 'info',
  type: 'info',
  ctaLabel: '',
  ctaUrl: '',
  linkLabel: '',
  linkUrl: '',
  linkType: 'regular',
  expiresInHours: '72',
};

const audienceOptions = [
  { value: 'all', label: 'All Users', icon: Users },
  { value: 'users', label: 'Regular Users', icon: UserCheck },
  { value: 'houseOwner', label: 'House Owners', icon: Shield },
  { value: 'caretaker', label: 'Caretakers', icon: UserCog },
  { value: 'admin', label: 'Admins', icon: Bell },
  { value: 'specific', label: 'Specific Users', icon: Megaphone },
];

const channelOptions = [
  { value: 'inApp', label: 'In-app' },
  { value: 'push', label: 'Push' },
  { value: 'email', label: 'Email' },
  { value: 'banner', label: 'Banner' },
];

const styleOptions = [
  { value: 'info', label: 'Info' },
  { value: 'general', label: 'General' },
  { value: 'critical', label: 'Critical' },
];

const linkTypeOptions = [
  { value: 'regular', label: 'Regular Link' },
  { value: 'whatsapp', label: 'WhatsApp (wa.me)' },
];

const AdminAnnouncements = () => {
  const { axios, getToken } = useAppContext();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingWasDeleted, setEditingWasDeleted] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [imageFile, setImageFile] = useState(null);
  const [recipientPreview, setRecipientPreview] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/announcements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setAnnouncements(data.announcements || []);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const token = await getToken();
        const query = new URLSearchParams({
          audience: form.audience,
          recipientTokens: form.recipientTokens,
        }).toString();
        const { data } = await axios.get(`/api/announcements/preview?${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) {
          setRecipientPreview(data);
        }
      } catch {
        setRecipientPreview(null);
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [form.audience, form.recipientTokens]);

  const selectedChannels = useMemo(() => new Set(form.channels), [form.channels]);

  const toggleChannel = (channel) => {
    setForm((current) => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel],
    }));
  };

  const toggleEditing = (announcement) => {
    setEditingId(announcement._id);
    setEditingWasDeleted(!announcement.active);
    setForm({
      title: announcement.title,
      body: announcement.body,
      audience: announcement.audience,
      recipientTokens: (announcement.recipientEmails || []).join(', '),
      channels: announcement.channels || ['inApp'],
      bannerStyle: announcement.bannerStyle || 'info',
      type: announcement.type || 'info',
      ctaLabel: announcement.ctaLabel || '',
      ctaUrl: announcement.ctaUrl || '',
      linkLabel: announcement.linkLabel || '',
      linkUrl: announcement.linkUrl || '',
      linkType: announcement.linkType || 'regular',
      expiresInHours: announcement.expiresAt ? String(Math.max(1, Math.round((new Date(announcement.expiresAt) - new Date()) / 3600000))) : '72',
    });
    setImageFile(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setEditingWasDeleted(false);
    setForm(defaultForm);
    setImageFile(null);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and message are required');
      return;
    }
    if (!selectedChannels.size) {
      toast.error('Choose at least one delivery channel');
      return;
    }
    if (!form.channels.includes('banner') && !form.channels.includes('inApp') && !form.channels.includes('push') && !form.channels.includes('email')) {
      toast.error('Choose at least one delivery channel');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('body', form.body);
      payload.append('audience', form.audience);
      payload.append('recipientTokens', form.recipientTokens);
      payload.append('channels', JSON.stringify(form.channels));
      payload.append('bannerStyle', form.bannerStyle);
      payload.append('type', form.type);
      payload.append('ctaLabel', form.ctaLabel);
      payload.append('ctaUrl', form.ctaUrl);
      payload.append('linkLabel', form.linkLabel);
      payload.append('linkUrl', form.linkUrl);
      payload.append('linkType', form.linkType);
      if (editingId) {
        // Editing an item always re-activates it so recoverable deletes can return.
        payload.append('active', 'true');
      }
      if (form.expiresInHours) {
        const expiresAt = new Date(Date.now() + Number(form.expiresInHours) * 60 * 60 * 1000);
        payload.append('expiresAt', expiresAt.toISOString());
      }
      if (imageFile) {
        payload.append('image', imageFile);
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const endpoint = editingId ? `/api/announcements/${editingId}` : '/api/announcements';
      const method = editingId ? 'put' : 'post';
      const { data } = await axios[method](endpoint, payload, config);

      if (data.success) {
        toast.success(editingId ? (editingWasDeleted ? 'Announcement updated and restored' : 'Announcement updated') : 'Announcement sent');
        resetForm();
        fetchAnnouncements();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAnnouncement = async (announcementId) => {
    if (!confirm('Delete this announcement? It will disappear but can be restored by editing and updating it.')) return;
    try {
      const token = await getToken();
      const { data } = await axios.post(`/api/announcements/${announcementId}/delete`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        toast.success('Announcement deleted (recoverable)');
        fetchAnnouncements();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const deleteAnnouncementForever = async (announcementId) => {
    if (!confirm('Permanently delete this announcement? This cannot be undone.')) return;
    try {
      const token = await getToken();
      const { data } = await axios.delete(`/api/announcements/${announcementId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        toast.success('Announcement permanently deleted');
        if (editingId === announcementId) {
          resetForm();
        }
        fetchAnnouncements();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-2"><Megaphone className="w-7 h-7 text-indigo-600" /> Admin Announcements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Send banners, notifications, emails, or push alerts to all users or a targeted audience.</p>
        </div>
        <button onClick={resetForm} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm">
          <Plus className="w-4 h-4" /> New Broadcast
        </button>
      </div>

      <form onSubmit={submitForm} className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium">Title</span>
              <input value={form.title} onChange={(e) => setForm((cur) => ({ ...cur, title: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" placeholder="System maintenance tonight" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Type</span>
              <select value={form.type} onChange={(e) => setForm((cur) => ({ ...cur, type: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm">
                <option value="info">Info</option>
                <option value="update">Update</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="general">General</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium">Message</span>
            <textarea value={form.body} onChange={(e) => setForm((cur) => ({ ...cur, body: e.target.value }))} rows={6} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" placeholder="Write the announcement details here..." />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-sm font-medium">Audience</span>
              <select value={form.audience} onChange={(e) => setForm((cur) => ({ ...cur, audience: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm">
                {audienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Banner Style</span>
              <select value={form.bannerStyle} onChange={(e) => setForm((cur) => ({ ...cur, bannerStyle: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm">
                {styleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Expires In</span>
              <div className="mt-1 flex items-center gap-2">
                <input value={form.expiresInHours} onChange={(e) => setForm((cur) => ({ ...cur, expiresInHours: e.target.value }))} type="number" min="1" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
                <span className="text-sm text-gray-500">hours</span>
              </div>
            </label>
          </div>

          {form.audience === 'specific' && (
            <label className="block">
              <span className="text-sm font-medium">Specific Recipients</span>
              <textarea value={form.recipientTokens} onChange={(e) => setForm((cur) => ({ ...cur, recipientTokens: e.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" placeholder="User IDs or emails, comma separated" />
            </label>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium">CTA Label</span>
              <input value={form.ctaLabel} onChange={(e) => setForm((cur) => ({ ...cur, ctaLabel: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" placeholder="View update" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">CTA URL</span>
              <input value={form.ctaUrl} onChange={(e) => setForm((cur) => ({ ...cur, ctaUrl: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" placeholder="/owner/list-room" />
            </label>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-3">Optional: Add a link button (e.g., WhatsApp support link)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-sm font-medium">Link Type</span>
                <select value={form.linkType} onChange={(e) => setForm((cur) => ({ ...cur, linkType: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm">
                  {linkTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Link Button Label</span>
                <input value={form.linkLabel} onChange={(e) => setForm((cur) => ({ ...cur, linkLabel: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" placeholder="Contact us on WhatsApp" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{form.linkType === 'whatsapp' ? 'WhatsApp Number (+254...)' : 'Link URL'}</span>
                <input value={form.linkUrl} onChange={(e) => setForm((cur) => ({ ...cur, linkUrl: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" placeholder={form.linkType === 'whatsapp' ? '254700000000' : 'https://...'} />
              </label>
            </div>
            {form.linkType === 'whatsapp' && form.linkUrl && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Preview: wa.me/{form.linkUrl.replace(/^\+?/, '')}</p>
            )}
          </div>

          <label className="block">
            <span className="text-sm font-medium flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Banner Image</span>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm" />
          </label>

          <div className="flex flex-wrap gap-2">
            {channelOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => toggleChannel(option.value)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium ${selectedChannels.has(option.value) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-60">
              <Send className="w-4 h-4" /> {editingId ? (editingWasDeleted ? 'Update + Restore Broadcast' : 'Update Broadcast') : 'Send Broadcast'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">Cancel Edit</button>
            )}
            {recipientPreview && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Estimated recipients: <strong>{recipientPreview.count}</strong></p>
            )}
          </div>
          {editingWasDeleted && (
            <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              This announcement is currently deleted. Clicking Update will restore it.
            </p>
          )}
        </div>

        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
            <h2 className="text-lg font-semibold mb-3">What each channel does</h2>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-start gap-2"><Bell className="w-4 h-4 mt-0.5 text-indigo-600" /> In-app keeps a notification inside the user inbox.</li>
              <li className="flex items-start gap-2"><LayoutTemplate className="w-4 h-4 mt-0.5 text-indigo-600" /> Banner shows a color-coded bar on the public site.</li>
              <li className="flex items-start gap-2"><Mail className="w-4 h-4 mt-0.5 text-indigo-600" /> Email sends a formatted message to recipients.</li>
              <li className="flex items-start gap-2"><Send className="w-4 h-4 mt-0.5 text-indigo-600" /> Push sends to subscribed browsers too.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
            <h2 className="text-lg font-semibold mb-3">Recent broadcasts</h2>
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : announcements.length === 0 ? (
              <p className="text-sm text-gray-500">No broadcasts yet.</p>
            ) : (
              <div className="space-y-3 max-h-[860px] overflow-y-auto pr-1">
                {announcements.map((announcement) => (
                  <div key={announcement._id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-semibold text-sm">{announcement.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{announcement.audience} · {Array.isArray(announcement.channels) ? announcement.channels.join(', ') : ''}</p>
                      </div>
                      <span className={`text-[11px] px-2 py-1 rounded-full ${announcement.active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {announcement.active ? 'Active' : 'Deleted (Recoverable)'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{announcement.body}</p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <button onClick={() => toggleEditing(announcement)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100">
                        <PencilLine className="w-3.5 h-3.5" /> Edit
                      </button>
                      {announcement.active && (
                        <button onClick={() => deleteAnnouncement(announcement._id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100">
                          <Trash2 className="w-3.5 h-3.5" /> Delete (Recoverable)
                        </button>
                      )}
                      <button onClick={() => deleteAnnouncementForever(announcement._id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100">
                        <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminAnnouncements;
