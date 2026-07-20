import {
  deletePushSubscription,
  upsertPushSubscription,
} from '@/supabase/database';

const SW_URL = '/sw.js';
const SW_SCOPE = '/';
const SW_READY_TIMEOUT_MS = 12_000;

function applicationServerKey(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes.buffer;
}

export function isWebPushSupported(): boolean {
  return 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

function waitForActivatedWorker(registration: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  if (registration.active) return Promise.resolve(registration);

  const worker = registration.installing || registration.waiting;
  if (!worker) return Promise.resolve(registration);

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('تعذر تجهيز خدمة الإشعارات. حدّث الصفحة وحاول مجدداً'));
    }, SW_READY_TIMEOUT_MS);

    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') {
        window.clearTimeout(timeout);
        resolve(registration);
      } else if (worker.state === 'redundant') {
        window.clearTimeout(timeout);
        reject(new Error('تعذر تجهيز خدمة الإشعارات. حدّث الصفحة وحاول مجدداً'));
      }
    });
  });
}

async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!isWebPushSupported()) {
    throw new Error('الإشعارات الفورية غير مدعومة على هذا الجهاز');
  }

  let registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  if (!registration) {
    registration = await navigator.serviceWorker.register(SW_URL, {
      scope: SW_SCOPE,
      updateViaCache: 'none',
    });
  }

  registration = await waitForActivatedWorker(registration);

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => {
      window.setTimeout(
        () => reject(new Error('تعذر تجهيز خدمة الإشعارات. حدّث الصفحة وحاول مجدداً')),
        SW_READY_TIMEOUT_MS,
      );
    }),
  ]);
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  const registration = await ensureServiceWorkerRegistration();
  return registration.pushManager.getSubscription();
}

export async function enableWebPush(userId: string): Promise<PushSubscription> {
  if (!isWebPushSupported()) throw new Error('الإشعارات الفورية غير مدعومة على هذا الجهاز');
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) throw new Error('مفتاح الإشعارات العام غير مضبوط');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('يجب السماح بالإشعارات من إعدادات المتصفح');

  const registration = await ensureServiceWorkerRegistration();
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey(publicKey),
  });
  await upsertPushSubscription(userId, subscription.toJSON());
  return subscription;
}

export async function disableWebPush(): Promise<void> {
  const subscription = await getPushSubscription();
  if (!subscription) return;
  await deletePushSubscription(subscription.endpoint);
  await subscription.unsubscribe();
}
