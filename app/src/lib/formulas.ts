/* Pure domain maths — the original app's formulas, reconstructed 1:1 */

import type { LevelsConfig, Profile } from './types';

export function uid(prefix = ''): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}${Date.now().toString(36)}${rnd}`;
}

/** Round to 2 decimals (money-safe). */
export function r2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

/** Integer-safe display of a possibly decimal amount. */
export function fmtNum(n: number): string {
  const v = r2(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

export function fmtEgp(n: number): string {
  return `${fmtNum(n)} ج.م`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * `Vr(level, config)` — XP required to clear `level`.
 * Order: explicit override → increment mode → multiplier mode. Clamped to >= 10.
 */
export function Vr(level: number, config: LevelsConfig): number {
  const lv = Math.max(1, Math.floor(level || 1));
  const override = config.overrides?.[String(lv)];
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return Math.max(10, Math.round(override));
  }
  const base = Math.max(1, config.baseXp || 100);
  const raw =
    config.scalingMode === 'multiplier'
      ? base * Math.pow(Math.max(1, config.multiplier || 1.2), lv - 1)
      : base + Math.max(0, config.increment || 0) * (lv - 1);
  return Math.max(10, Math.round(raw));
}

export interface LevelResult {
  level: number;
  xp: number;
  leveled: boolean;
}

/**
 * `FR(profile, xpDelta, config)` — adds XP and rolls levels.
 * Max 50 level-ups per call (mirrors the original guard).
 */
export function FR(
  profile: Pick<Profile, 'level' | 'xp'>,
  xpDelta: number,
  config: LevelsConfig
): LevelResult {
  let level = Math.max(1, Math.floor(profile.level || 1));
  let xp = Math.max(0, r2((profile.xp || 0) + xpDelta));
  let leveled = false;

  // Negative grant can demote
  if (xpDelta < 0) {
    let guard = 0;
    while (xp < 0 && level > 1 && guard < 50) {
      level -= 1;
      xp = r2(xp + Vr(level, config));
      guard += 1;
    }
    if (xp < 0) xp = 0;
    return { level, xp, leveled: false };
  }

  let guard = 0;
  while (xp >= Vr(level, config) && guard < 50) {
    xp = r2(xp - Vr(level, config));
    level += 1;
    leveled = true;
    guard += 1;
  }
  return { level, xp, leveled };
}

/** Progress (0..1) through the current level. */
export function levelProgress(profile: Pick<Profile, 'level' | 'xp'>, config: LevelsConfig) {
  const need = Vr(profile.level, config);
  const xpInLevel = clamp(profile.xp, 0, need);
  return { need, xpInLevel, progress: need > 0 ? xpInLevel / need : 0 };
}

/** Week key `YYYY-Www` used to reset weekly counters. */
export function weekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function dayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

/** `Hr(minutes)` — human Arabic duration. */
export function Hr(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r} د`;
  if (r === 0) return `${h} س`;
  return `${h} س ${r} د`;
}

/** `mm:ss` / `hh:mm:ss` clock for the focus timer. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Math.max(0, Date.now() - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'الآن';
  if (min < 60) return `من ${min} د`;
  const h = Math.floor(min / 60);
  if (h < 24) return `من ${h} س`;
  const d = Math.floor(h / 24);
  if (d < 30) return `من ${d} يوم`;
  return new Date(t).toLocaleDateString('ar-EG');
}

/** Deterministic avatar colour from a name. */
const AVATAR_COLORS = [
  '#8b5cf6',
  '#22d3ee',
  '#34d399',
  '#f59e0b',
  '#f472b6',
  '#60a5fa',
  '#f87171',
  '#a3e635',
];

export function colorFromName(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum = (sum + name.charCodeAt(i) * (i + 7)) % 9973;
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function usernameFromEmail(email: string | null): string {
  if (!email) return 'مستخدم';
  return email
    .split('@')[0]
    .replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '')
    .slice(0, 18);
}

/** Streak rule: +1 when yesterday was the last active day, reset when a gap exists. */
export function nextStreak(profile: Pick<Profile, 'streak' | 'lastActiveDay'>, today = new Date()) {
  const todayKey = dayKey(today);
  const yesterday = new Date(today.getTime() - 86400000);
  const yKey = dayKey(yesterday);
  if (profile.lastActiveDay === todayKey) return profile.streak || 1;
  if (profile.lastActiveDay === yKey) return (profile.streak || 0) + 1;
  return 1;
}
