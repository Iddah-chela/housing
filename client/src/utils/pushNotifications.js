import axios from 'axios';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Convert a base64 VAPID key to a Uint8Array for the Push API.
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/**
 * Check if push notifications are supported in this browser.
 */
export function isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Get current notification permission state.
 * @returns {'granted' | 'denied' | 'default'}
 */
export function getPermissionState() {
    if (!isPushSupported()) return 'denied';
    return Notification.permission;
}

/**
 * Subscribe the user to push notifications.
 * 1. Requests notification permission
 * 2. Subscribes via the service worker's PushManager
 * 3. Sends the subscription to the backend
 * 
 * @param {Function} getToken - function to get auth token
 * @returns {boolean} true if subscribed successfully
 */
export async function subscribeToPush(getToken) {

    if (!isPushSupported()) {
        return false;
    }

    try {
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            return false;
        }

        // Get SW registration (with timeout � hangs forever if SW failed to register)
        const registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker not ready after 10s')), 10000))
        ]);

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();
        if (subscription) {
        } else {
            if (!VAPID_PUBLIC_KEY) {
                return false;
            }
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }

        // Send subscription to backend
        const token = await getToken();
        if (!token) {
            return false;
        }

        // Use toJSON() which provides keys in base64url format (required by web-push)
        const subJson = subscription.toJSON();

        const { data } = await axios.post('/api/notifications/subscribe', {
            endpoint: subJson.endpoint,
            keys: {
                p256dh: subJson.keys.p256dh,
                auth: subJson.keys.auth
            }
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });


        if (data.success) {
            localStorage.setItem('PataKeja_push_enabled', 'true');
            return true;
        }

        return false;
    } catch (err) {
        return false;
    }
}

/**
 * Unsubscribe from push notifications.
 * @param {Function} getToken
 */
export async function unsubscribeFromPush(getToken) {
    if (!isPushSupported()) return;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            // Notify backend
            const token = await getToken();
            if (token) {
                await axios.post('/api/notifications/unsubscribe', {
                    endpoint: subscription.endpoint
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => {});
            }

            // Unsubscribe locally
            await subscription.unsubscribe();
        }

        localStorage.removeItem('PataKeja_push_enabled');
    } catch (err) {
    }
}

/**
 * Silently re-subscribe if user previously opted in (e.g. after page reload).
 * Does not prompt � only re-subscribes if permission is already granted.
 * @param {Function} getToken
 */
export async function resubscribeIfNeeded(getToken) {
    if (!isPushSupported()) return;
    if (Notification.permission !== 'granted') {
        return;
    }
    if (localStorage.getItem('PataKeja_push_enabled') !== 'true') {
        return;
    }

    try {
        const registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('SW not ready')), 10000))
        ]);
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
            if (!VAPID_PUBLIC_KEY) {
                return;
            }
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }

        // Re-send to backend in case it was lost
        const token = await getToken();
        if (!token) {
            return;
        }

        const subJson = subscription.toJSON();
        const { data } = await axios.post('/api/notifications/subscribe', {
            endpoint: subJson.endpoint,
            keys: {
                p256dh: subJson.keys.p256dh,
                auth: subJson.keys.auth
            }
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (err) {
    }
}
