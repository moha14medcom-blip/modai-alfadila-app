/* Local notification helper — mirrors the original live-timer notification. */

export function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notifyPermission(): NotificationPermission | 'unsupported' {
  if (!canNotify()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotifyPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!canNotify()) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function notify(title: string, body?: string, tag = 'maddei'): boolean {
  if (!canNotify() || Notification.permission !== 'granted') return false;
  try {
    const n = new Notification(title, {
      body,
      tag,
      dir: 'rtl',
      lang: 'ar',
      silent: false,
    });
    window.setTimeout(() => n.close(), 12000);
    return true;
  } catch {
    return false;
  }
}
