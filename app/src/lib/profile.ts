import { APP_ID, DEFAULT_THEME, DEFAULT_VOLUME } from './defaults';
import { colorFromName, uid, usernameFromEmail, weekKey } from './formulas';
import type { Profile } from './types';

export function makeProfile(id: string, email: string | null, overrides: Partial<Profile> = {}): Profile {
  const username = overrides.username ?? usernameFromEmail(email);
  return {
    id,
    email,
    username,
    displayName: overrides.displayName ?? username,
    avatarColor: overrides.avatarColor ?? colorFromName(username),
    avatarUrl: '',
    coverUrl: '',
    level: 1,
    xp: 0,
    egp: 0,
    totalTasks: 0,
    totalFocusMin: 0,
    weeklyWeek: weekKey(),
    weeklyTasks: 0,
    weeklyFocusMin: 0,
    weeklyEgp: 0,
    streak: 1,
    lastActiveDay: '',
    blocked: false,
    theme: DEFAULT_THEME,
    soundVolume: DEFAULT_VOLUME,
    timerNotify: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function newLocalProfileId(): string {
  return `${APP_ID}-local`;
}

export function invitationLink(username: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  return `${base}#/social?u=${encodeURIComponent(username)}`;
}

export function awardBadgeName(level: number): string {
  if (level >= 60) return 'أسطورة الفضيلة';
  if (level >= 40) return 'فارس التركيز';
  if (level >= 25) return 'مثابر عنيد';
  if (level >= 15) return 'بطل الأسبوع';
  if (level >= 8) return 'صاعد واعد';
  if (level >= 4) return 'مسار منتظم';
  return 'مبتدئ الفلاحين';
}
