import type { LevelsConfig, RewardUnit, SoundSettings, ThemeId, TimerState } from './types';
import { DEFAULT_SOUNDS } from './sounds';

export const APP_NAME = 'مدّعي الفضيلة';
export const APP_ID = (import.meta.env.VITE_APP_ID as string) || 'maddei';
export const SUPER_ADMIN_EMAIL =
  (import.meta.env.VITE_SUPER_ADMIN_EMAIL as string) || 'moha14med.com@gmail.com';
export const BACKUP_KIND = 'maddei-virtue-backup';
export const BACKUP_VERSION = 1;

/** Local-only pseudo user id used when Supabase is not configured. */
export const LOCAL_USER_ID = 'local-user';

export const LS_KEYS = {
  theme: 'aura.theme',
  timer: 'aura.timer',
  sounds: 'aura.sounds',
  volume: 'aura.volume',
  notify: 'aura.notify',
  session: 'aura.session',
};

export const DEFAULT_CONFIG: LevelsConfig = {
  baseXp: 100,
  scalingMode: 'increment',
  increment: 50,
  multiplier: 1.2,
  overrides: {},
  egpPerMinute: 0.5,
  xpPerMinute: 1,
  autoApprove: false,
};

export const DEFAULT_UNITS: RewardUnit[] = [
  { id: 'unit_half', name: 'نص جهد', egp: 10, xp: 15, icon: '🌗', active: true, order: 1 },
  { id: 'unit_full', name: 'جهد كامل', egp: 25, xp: 40, icon: '🌕', active: true, order: 2 },
  { id: 'unit_deep', name: 'جهد عميق', egp: 40, xp: 70, icon: '🔥', active: true, order: 3 },
];

export const DEFAULT_TIMER: TimerState = {
  mode: 'pomodoro',
  pomo: { focus: 25, short: 5, long: 15, sessions: 4 },
  countdownMin: 25,
  autoBreak: true,
  autoNext: false,
  selectedTaskId: null,
};

export const DEFAULT_TIP = 'ابدأ أصغر مهمة عندك — الحركة أول خطوة في أي إنجاز.';

export const DEFAULT_THEME: ThemeId = 'virtue';
export const DEFAULT_VOLUME = 0.85;

export const DEFAULT_SOUND_SETTINGS: SoundSettings = DEFAULT_SOUNDS;

export const PROJECT_COLORS = [
  '#8b5cf6',
  '#22d3ee',
  '#34d399',
  '#f59e0b',
  '#f472b6',
  '#60a5fa',
  '#f87171',
  '#a3e635',
  '#eab308',
  '#14b8a6',
];

export const EMOJI_GROUPS: { label: string; items: string[] }[] = [
  {
    label: 'عمل ودراسة',
    items: ['📚', '📝', '💻', '🧠', '📊', '🗂️', '🖊️', '🔬', '🧪', '📐'],
  },
  {
    label: 'رياضة وصحة',
    items: ['🏋️', '🏃', '🚴', '🧘', '💧', '🥗', '😴', '🩺', '⚽', '🥊'],
  },
  {
    label: 'بيت وحياة',
    items: ['🏠', '🧹', '🧺', '🍳', '🛒', '🐈', '🌱', '🔧', '🧾', '🎁'],
  },
  {
    label: 'روحانيات وأهداف',
    items: ['🕌', '📖', '🤲', '⭐', '🎯', '🏆', '💎', '🔥', '🌙', '☀️'],
  },
  {
    label: 'ترفيه',
    items: ['🎮', '🎧', '🎬', '🎨', '🎸', '☕', '🍫', '🛍️', '✈️', '🎉'],
  },
];

export const ALL_EMOJIS = EMOJI_GROUPS.flatMap((g) => g.items);

export const WEEK_DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
