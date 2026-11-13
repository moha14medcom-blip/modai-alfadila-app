/* Domain model — mirrors the data model documented in CODE_WIKI.md */

export type ID = string;

export type ThemeId = 'virtue' | 'deep' | 'light' | 'stem' | 'midnight' | 'cyber';
export type TimerMode = 'pomodoro' | 'countdown' | 'stopwatch';
export type SoundId = 'alarm' | 'double' | 'radar' | 'horn';

export interface Profile {
  id: ID;
  email: string | null;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl: string;
  coverUrl: string;
  level: number;
  xp: number;
  egp: number;
  totalTasks: number;
  totalFocusMin: number;
  weeklyWeek: string;
  weeklyTasks: number;
  weeklyFocusMin: number;
  weeklyEgp: number;
  streak: number;
  lastActiveDay: string;
  blocked: boolean;
  theme: ThemeId;
  soundVolume: number;
  timerNotify: boolean;
  createdAt: string;
}

export interface Project {
  id: ID;
  ownerId: ID;
  name: string;
  color: string;
  emoji: string;
  order: number;
  createdAtLocal: string;
}

export interface TaskList {
  id: ID;
  ownerId: ID;
  projectId: ID;
  name: string;
  emoji: string;
  order: number;
}

export interface Task {
  id: ID;
  ownerId: ID;
  listId: ID;
  projectId: ID;
  projectName: string;
  listName: string;
  title: string;
  unitId: ID | null;
  unitName: string;
  unitIcon: string;
  icon: string;
  egp: number;
  xp: number;
  done: boolean;
  doneAt: string | null;
  focusMinutes: number;
}

export interface InventoryItem {
  id: ID;
  ownerId: ID;
  itemId: ID;
  name: string;
  desc: string;
  egp: number;
  icon: string;
  durationMin: number;
  remainingMs: number;
  running: boolean;
  endsAt: number | null;
  status: 'ready' | 'active' | 'used';
  boughtAt: string;
}

export interface FocusLog {
  id: ID;
  ownerId: ID;
  minutes: number;
  egp: number;
  xp: number;
  mode: TimerMode;
  taskId: ID | null;
  taskTitle: string;
  listId: ID | null;
  at: string;
}

export interface RewardUnit {
  id: ID;
  name: string;
  egp: number;
  xp: number;
  icon: string;
  active: boolean;
  order: number;
}

export interface RewardRequest {
  id: ID;
  name: string;
  desc: string;
  icon: string;
  egp: number;
  kind: 'store' | 'personal';
  durationMin: number;
  status: 'pending' | 'approved' | 'rejected';
  userId: ID;
  userName: string;
  username: string;
  at: string;
}

export interface StoreItem {
  id: ID;
  name: string;
  desc: string;
  egp: number;
  icon: string;
  durationMin: number;
  active: boolean;
  ownerId: ID;
  requestedBy?: string;
  sourceRequest?: ID;
}

export interface Friendship {
  id: ID;
  fromId: ID;
  fromName: string;
  fromUsername: string;
  toId: ID;
  toName: string;
  toUsername: string;
  status: 'pending' | 'accepted';
  at: string;
}

export interface Cheer {
  id: ID;
  fromId: ID;
  fromName: string;
  toId: ID;
  text: string;
  at: string;
}

export interface Announcement {
  id: ID;
  text: string;
  at: string;
}

export interface LevelsConfig {
  baseXp: number;
  scalingMode: 'increment' | 'multiplier';
  increment: number;
  multiplier: number;
  overrides: Record<string, number>;
  egpPerMinute: number;
  xpPerMinute: number;
  autoApprove: boolean;
}

export interface PomodoroConfig {
  focus: number;
  short: number;
  long: number;
  sessions: number;
}

export interface TimerState {
  mode: TimerMode;
  pomo: PomodoroConfig;
  countdownMin: number;
  autoBreak: boolean;
  autoNext: boolean;
  selectedTaskId: ID | null;
}

export interface SoundSettings {
  pomodoro: SoundId;
  countdown: SoundId;
  reward: SoundId;
}

export interface GrantInput {
  egp?: number;
  xp?: number;
  focusMin?: number;
  tasks?: number;
}

export interface BackupDocument {
  app: string;
  kind: 'maddei-virtue-backup';
  version: number;
  exportedAt: string;
  account: { id: ID; email: string | null };
  profile: Partial<Profile>;
  projects: Project[];
  lists: TaskList[];
  tasks: Task[];
  inventory: InventoryItem[];
  settings: {
    theme: ThemeId;
    sounds: SoundSettings;
    volume: number;
    notifyOn: boolean;
    config: LevelsConfig;
  };
}

export type Tone = 'info' | 'ok' | 'warn' | 'bad';

export interface Toast {
  id: ID;
  text: string;
  tone: Tone;
}
