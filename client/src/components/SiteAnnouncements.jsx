import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { X, AlertTriangle, Info, Megaphone } from 'lucide-react';

const styleMap = {
  info: {
    wrapper: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100',
    icon: Info,
    iconBg: 'bg-sky-500',
  },
  general: {
    wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100',
    icon: Megaphone,
    iconBg: 'bg-emerald-500',
  },
  critical: {
    wrapper: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100',
    icon: AlertTriangle,
    iconBg: 'bg-red-500',
  },
};

const DISMISS_KEY = 'PataKeja_dismissed_announcements';

const SiteAnnouncements = () => {
  const { axios } = useAppContext();
  const [announcements, setAnnouncements] = useState([]);

  const loadAnnouncements = async () => {
    try {
      const { data } = await axios.get('/api/announcements/active');
      if (data.success) {
        setAnnouncements(data.announcements || []);
      }
    } catch {
      // Silent fallback; banners are optional.
    }
  };

  useEffect(() => {
    loadAnnouncements();
    const pollId = window.setInterval(loadAnnouncements, 60000);
    return () => window.clearInterval(pollId);
  }, []);

  const dismissed = (() => {
    try {
      return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]');
    } catch {
      return [];
    }
  })();

  const visible = announcements.filter((announcement) => !dismissed.includes(announcement._id));

  const dismiss = (id) => {
    try {
      const next = Array.from(new Set([...dismissed, id]));
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
      setAnnouncements((current) => current.filter((announcement) => announcement._id !== id));
    } catch {
      setAnnouncements((current) => current.filter((announcement) => announcement._id !== id));
    }
  };

  if (!visible.length) return null;

  return (
    <div className="px-4 pt-3 md:px-6 lg:px-8 space-y-3">
      {visible.map((announcement) => {
        const config = styleMap[announcement.bannerStyle] || styleMap.info;
        const Icon = config.icon;

        return (
          <div key={announcement._id} className={`rounded-2xl border shadow-sm overflow-hidden ${config.wrapper}`}>
            <div className="flex items-start gap-3 p-4 md:p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${config.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-base md:text-lg">{announcement.title}</p>
                    <p className="text-sm md:text-[15px] mt-1 leading-6 whitespace-pre-line">{announcement.body}</p>
                  </div>
                  <button
                    onClick={() => dismiss(announcement._id)}
                    className="text-current/70 hover:text-current shrink-0 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label="Dismiss banner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {(announcement.imageUrl || announcement.ctaLabel) && (
                  <div className="mt-4 flex flex-col md:flex-row gap-4 md:items-center">
                    {announcement.imageUrl && (
                      <img
                        src={announcement.imageUrl}
                        alt={announcement.title}
                        className="w-full md:w-48 h-32 object-cover rounded-xl border border-white/40 dark:border-white/10"
                      />
                    )}
                    {announcement.ctaLabel && (
                      <a
                        href={announcement.ctaUrl || '/'}
                        className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-black/90 text-white hover:bg-black transition-colors"
                      >
                        {announcement.ctaLabel}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SiteAnnouncements;
