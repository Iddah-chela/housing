import React, { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, Info, Megaphone, MessageCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

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

const DISMISS_KEY = 'PataKeja_dismissed_announcements_v2';

const readDismissedMap = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  } catch {
    // ignore parse errors
  }

  // Backward compatibility: migrate old array format once.
  try {
    const legacy = JSON.parse(localStorage.getItem('PataKeja_dismissed_announcements') || '[]');
    if (Array.isArray(legacy)) {
      const migrated = legacy.reduce((acc, id) => {
        acc[String(id)] = 'legacy';
        return acc;
      }, {});
      localStorage.setItem(DISMISS_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // ignore parse errors
  }

  return {};
};

const SiteAnnouncements = () => {
  const { axios } = useAppContext();
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedMap, setDismissedMap] = useState(() => readDismissedMap());
  const containerRef = useRef(null);

  const loadAnnouncements = async () => {
    try {
      const { data } = await axios.get('/api/announcements/active');
      if (data?.success) {
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

  const visible = announcements.filter((announcement) => {
    const currentVersion = String(announcement.updatedAt || announcement.createdAt || '');
    const dismissedVersion = dismissedMap[String(announcement._id)];

    if (!dismissedVersion) return true;
    if (!currentVersion) return false;

    // If announcement changed after dismissal, show it again.
    return dismissedVersion !== currentVersion;
  });

  useEffect(() => {
    const root = document.documentElement;

    if (!visible.length) {
      root.style.removeProperty('--announcement-offset');
      return;
    }

    const updateOffset = () => {
      const height = containerRef.current?.offsetHeight || 0;
      const paddedHeight = height > 0 ? height + 4 : 0;
      root.style.setProperty('--announcement-offset', `${paddedHeight}px`);
    };

    updateOffset();

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(updateOffset);
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateOffset);

    return () => {
      window.removeEventListener('resize', updateOffset);
      if (resizeObserver) resizeObserver.disconnect();
      root.style.removeProperty('--announcement-offset');
    };
  }, [visible.length]);

  const dismiss = (id, version) => {
    try {
      const next = {
        ...dismissedMap,
        [String(id)]: String(version || new Date().toISOString()),
      };
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
      setDismissedMap(next);
      setAnnouncements((current) => current.filter((announcement) => announcement._id !== id));
    } catch {
      setAnnouncements((current) => current.filter((announcement) => announcement._id !== id));
    }
  };

  if (!visible.length) return null;

  return (
    <div ref={containerRef} className="fixed top-0 left-0 right-0 z-[200] px-3 pt-1 md:px-6 lg:px-8 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 space-y-1 max-h-[24vh] overflow-y-auto">
      {visible.map((announcement, index) => {
        const config = styleMap[announcement.bannerStyle] || styleMap.info;
        const Icon = config.icon;

        return (
          <div key={announcement._id} className={`${index > 0 ? 'hidden md:block' : ''} rounded-md border shadow-sm overflow-hidden ${config.wrapper}`}>
            <div className="flex items-start gap-2 p-2 md:gap-2.5 md:p-2.5">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0 ${config.iconBg}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 md:gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-xs md:text-sm leading-4">{announcement.title}</p>
                    <p className="text-[11px] md:text-xs mt-0.5 leading-4 whitespace-pre-line line-clamp-2 md:line-clamp-3">{announcement.body}</p>
                  </div>
                  <button
                    onClick={() => dismiss(announcement._id, announcement.updatedAt || announcement.createdAt)}
                    className="text-current/70 hover:text-current shrink-0 rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label="Dismiss banner"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(announcement.imageUrl || announcement.ctaLabel || announcement.linkLabel) && (
                  <div className="mt-2 flex flex-col md:flex-row gap-1.5 md:gap-2 md:items-center">
                    {announcement.imageUrl && (
                      <img
                        src={announcement.imageUrl}
                        alt={announcement.title}
                        className="hidden md:block w-28 h-14 object-cover rounded-md border border-white/40 dark:border-white/10"
                      />
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {announcement.ctaLabel && (
                        <a
                          href={announcement.ctaUrl || '/'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[11px] md:text-xs font-semibold bg-black/90 text-white hover:bg-black transition-colors"
                        >
                          {announcement.ctaLabel}
                        </a>
                      )}
                      {announcement.linkLabel && (
                        <a
                          href={announcement.linkUrl || '/'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1 text-[11px] md:text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          {announcement.linkType === 'whatsapp' && <MessageCircle className="w-3.5 h-3.5" />}
                          {announcement.linkLabel}
                        </a>
                      )}
                    </div>
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
