import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const VISITOR_KEY = 'PataKeja_visitor_id';
const SESSION_KEY = 'PataKeja_session_id';

const makeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getOrCreateId = (storage, key) => {
  try {
    let value = storage.getItem(key);
    if (!value) {
      value = makeId();
      storage.setItem(key, value);
    }
    return value;
  } catch {
    return makeId();
  }
};

const VisitTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      return;
    }

    const visitorId = getOrCreateId(localStorage, VISITOR_KEY);
    const sessionId = getOrCreateId(sessionStorage, SESSION_KEY);

    const payload = {
      path: `${location.pathname}${location.search || ''}`,
      visitorId,
      sessionId,
      referrer: document.referrer || '',
    };

    const base = String(import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
    const endpoint = base ? `${base}/api/analytics/visit` : '/api/analytics/visit';

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {});
  }, [location.pathname, location.search]);

  return null;
};

export default VisitTracker;
