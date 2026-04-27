import React, { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, Info, Megaphone, MessageCircle } from 'lucide-react';

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
  const [announcements, setAnnouncements] = useState([]);
  const containerRef = useRef(null);

  const loadAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements/active');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnnouncements(data.announcements || []);
        }
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

  useEffect(() => {
    const root = document.documentElement;

    if (!visible.length) {
      root.style.removeProperty('--announcement-offset');
      return;
    }

    const updateOffset = () => {
      const height = containerRef.current?.offsetHeight || 0;
      root.style.setProperty('--announcement-offset', `${height}px`);
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
    <div ref={containerRef} className="fixed top-0 left-0 right-0 z-[100] px-4 pt-2 md:px-6 lg:px-8 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 space-y-2">
      {visible.map((announcement) => {
        const config = styleMap[announcement.bannerStyle] || styleMap.info;
        const Icon = config.icon;

        return (
          <div key={announcement._id} className={`rounded-lg border shadow-sm overflow-hidden ${config.wrapper}`}>
            <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 ${config.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 md:gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm md:text-base">{announcement.title}</p>
                    <p className="text-xs md:text-sm mt-0.5 leading-5 whitespace-pre-line">{announcement.body}</p>
                  </div>
                  <button
                    onClick={() => dismiss(announcement._id)}
                    className="text-current/70 hover:text-current shrink-0 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label="Dismiss banner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {(announcement.imageUrl || announcement.ctaLabel || announcement.linkLabel) && (
                  <div className="mt-3 flex flex-col md:flex-row gap-2 md:gap-3 md:items-center">
                    {announcement.imageUrl && (
                      <img
                        src={announcement.imageUrl}
                        alt={announcement.title}
                        className="w-full md:w-40 h-24 object-cover rounded-lg border border-white/40 dark:border-white/10"
                      />
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {announcement.ctaLabel && (
                        <a
                          href={announcement.ctaUrl || '/'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs md:text-sm font-semibold bg-black/90 text-white hover:bg-black transition-colors"
                        >
                          {announcement.ctaLabel}
                        </a>
                      )}
                      {announcement.linkLabel && (
                        <a
                          href={announcement.linkUrl || '/'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs md:text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          {announcement.linkType === 'whatsapp' && <MessageCircle className="w-4 h-4" />}
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
