import { createContext, useContext } from 'react';
import type {
  Announcement,
  Cheer,
  FocusLog,
  Friendship,
  GrantInput,
  ID,
  InventoryItem,
  LevelsConfig,
  Profile,
  Project,
  RewardRequest,
  RewardUnit,
  SoundId,
  SoundSettings,
  StoreItem,
  Task,
  TaskList,
  ThemeId,
  TimerMode,
  TimerState,
  Tone,
  Toast,
} from '../lib/types';

export interface Stats {
  need: number;
  xpInLevel: number;
  progress: number;
  doneToday: number;
  focusToday: number;
  weekTasks: number;
  weekFocus: number;
  weekEgp: number;
}

export interface SyncState {
  online: boolean;
  pending: number;
  syncing: boolean;
}

export interface AppApi {
  ready: boolean;
  cloud: boolean;
  user: { id: ID; email: string | null } | null;
  isAdmin: boolean;

  profile: Profile;
  config: LevelsConfig;
  projects: Project[];
  lists: TaskList[];
  tasks: Task[];
  inventory: InventoryItem[];
  logs: FocusLog[];
  units: RewardUnit[];
  requests: RewardRequest[];
  storeItems: StoreItem[];
  friends: Friendship[];
  people: Profile[];
  cheers: Cheer[];
  announcement: Announcement | null;
  tip: string;
  stats: Stats;
  sync: SyncState;

  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  sounds: SoundSettings;
  setSounds: (s: SoundSettings) => void;
  soundVolume: number;
  setSoundVolume: (v: number) => void;
  notifyOn: boolean;
  setNotifyOn: (v: boolean) => void;
  previewSound: (id: SoundId) => void;

  timer: TimerState;
  setTimer: (patch: Partial<TimerState>) => void;

  toasts: Toast[];
  toast: (text: string, tone?: Tone) => void;
  dismissToast: (id: ID) => void;

  /* auth */
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  /* tasks */
  addProject: (input: { name: string; emoji: string; color: string }) => Promise<void>;
  updateProject: (id: ID, patch: Partial<Project>) => Promise<void>;
  removeProject: (id: ID) => Promise<void>;
  addList: (projectId: ID, input: { name: string; emoji: string }) => Promise<void>;
  updateList: (id: ID, patch: Partial<TaskList>) => Promise<void>;
  removeList: (id: ID) => Promise<void>;
  addTask: (listId: ID, input: { title: string; unitId: ID | null; icon: string }) => Promise<void>;
  updateTask: (id: ID, patch: Partial<Task>) => Promise<void>;
  toggleTask: (id: ID) => Promise<void>;
  removeTask: (id: ID) => Promise<void>;

  /* rewards & focus */
  grantReward: (input: GrantInput) => Promise<{ leveled: boolean; level: number }>;
  commitFocus: (
    minutes: number,
    opts: { mode: TimerMode; taskId?: ID | null }
  ) => Promise<{ egp: number; xp: number }>;

  /* store */
  buyItem: (item: StoreItem) => Promise<boolean>;
  inventoryAction: (id: ID, action: 'activate' | 'pause' | 'resume' | 'use') => Promise<void>;
  suggestReward: (input: {
    name: string;
    desc: string;
    icon: string;
    egp: number;
    durationMin: number;
  }) => Promise<void>;

  /* profile */
  saveProfile: (patch: Partial<Profile>) => Promise<void>;
  uploadAvatar: (file: File, kind: 'avatar' | 'cover') => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: (file: File) => Promise<void>;
  refresh: () => Promise<void>;

  /* social */
  sendFriendRequest: (username: string) => Promise<void>;
  respondFriend: (id: ID, accept: boolean) => Promise<void>;
  sendCheer: (toId: ID, text: string) => Promise<void>;
  removeFriend: (id: ID) => Promise<void>;

  /* admin */
  saveConfig: (patch: Partial<LevelsConfig>) => Promise<void>;
  saveUnit: (unit: RewardUnit) => Promise<void>;
  removeUnit: (id: ID) => Promise<void>;
  saveStoreItem: (item: Partial<StoreItem> & { id?: ID }) => Promise<void>;
  removeStoreItem: (id: ID) => Promise<void>;
  decideRequest: (id: ID, action: 'approve' | 'reject' | 'personal') => Promise<void>;
  adminUpdateUser: (id: ID, patch: Partial<Profile>) => Promise<void>;
  postAnnouncement: (text: string) => Promise<void>;
  saveTip: (text: string) => Promise<void>;
}

export const AppContext = createContext<AppApi | null>(null);

export function useApp(): AppApi {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
