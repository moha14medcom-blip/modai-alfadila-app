/* JSON backup export / import (kind sentinel + id remapping), as in the original app. */

import {
  APP_NAME,
  BACKUP_KIND,
  BACKUP_VERSION,
  DEFAULT_CONFIG,
  DEFAULT_SOUND_SETTINGS,
  DEFAULT_THEME,
  DEFAULT_VOLUME,
} from './defaults';
import { uid } from './formulas';
import type {
  BackupDocument,
  InventoryItem,
  LevelsConfig,
  Project,
  Profile,
  SoundSettings,
  Task,
  TaskList,
  ThemeId,
} from './types';

export interface BackupInput {
  account: { id: string; email: string | null };
  profile: Profile;
  projects: Project[];
  lists: TaskList[];
  tasks: Task[];
  inventory: InventoryItem[];
  theme: ThemeId;
  sounds: SoundSettings;
  volume: number;
  notifyOn: boolean;
  config: LevelsConfig;
}

export function buildBackup(input: BackupInput): BackupDocument {
  return {
    app: APP_NAME,
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    account: input.account,
    profile: {
      username: input.profile.username,
      displayName: input.profile.displayName,
      avatarColor: input.profile.avatarColor,
      avatarUrl: input.profile.avatarUrl,
      coverUrl: input.profile.coverUrl,
      level: input.profile.level,
      xp: input.profile.xp,
      egp: input.profile.egp,
      totalTasks: input.profile.totalTasks,
      totalFocusMin: input.profile.totalFocusMin,
      weeklyWeek: input.profile.weeklyWeek,
      weeklyTasks: input.profile.weeklyTasks,
      weeklyFocusMin: input.profile.weeklyFocusMin,
      weeklyEgp: input.profile.weeklyEgp,
      streak: input.profile.streak,
      lastActiveDay: input.profile.lastActiveDay,
      theme: input.profile.theme,
      soundVolume: input.profile.soundVolume,
      timerNotify: input.profile.timerNotify,
    },
    projects: input.projects,
    lists: input.lists,
    tasks: input.tasks,
    inventory: input.inventory,
    settings: {
      theme: input.theme,
      sounds: input.sounds,
      volume: input.volume,
      notifyOn: input.notifyOn,
      config: input.config,
    },
  };
}

export function backupFileName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `maddei-backup-${y}${m}${d}.json`;
}

export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result ?? '{}')));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsText(file);
  });
}

export class BackupError extends Error {}

/** Validates the sentinel; throws `NOT_A_BACKUP` for unrelated JSON files. */
export function validateBackup(json: unknown): BackupDocument {
  const doc = json as Partial<BackupDocument> | null;
  if (!doc || typeof doc !== 'object' || doc.kind !== BACKUP_KIND) {
    throw new BackupError('NOT_A_BACKUP');
  }
  return {
    app: doc.app ?? APP_NAME,
    kind: BACKUP_KIND,
    version: doc.version ?? BACKUP_VERSION,
    exportedAt: doc.exportedAt ?? new Date().toISOString(),
    account: doc.account ?? { id: '', email: null },
    profile: doc.profile ?? {},
    projects: Array.isArray(doc.projects) ? doc.projects : [],
    lists: Array.isArray(doc.lists) ? doc.lists : [],
    tasks: Array.isArray(doc.tasks) ? doc.tasks : [],
    inventory: Array.isArray(doc.inventory) ? doc.inventory : [],
    settings: {
      theme: doc.settings?.theme ?? DEFAULT_THEME,
      sounds: doc.settings?.sounds ?? DEFAULT_SOUND_SETTINGS,
      volume: typeof doc.settings?.volume === 'number' ? doc.settings.volume : DEFAULT_VOLUME,
      notifyOn: Boolean(doc.settings?.notifyOn),
      config: { ...DEFAULT_CONFIG, ...(doc.settings?.config ?? {}) },
    },
  };
}

export interface RemappedBackup {
  projects: Project[];
  lists: TaskList[];
  tasks: Task[];
  inventory: InventoryItem[];
}

/** Rebuilds the hierarchy with fresh ids, dropping orphans. */
export function remapBackup(doc: BackupDocument, ownerId: string): RemappedBackup {
  const projectMap = new Map<string, string>();
  const listMap = new Map<string, string>();

  const projects: Project[] = doc.projects.map((p, i) => {
    const id = uid('prj_');
    projectMap.set(p.id, id);
    return { ...p, id, ownerId, order: p.order ?? i + 1 };
  });

  const lists: TaskList[] = [];
  doc.lists.forEach((l, i) => {
    const projectId = projectMap.get(l.projectId);
    if (!projectId) return;
    const id = uid('lst_');
    listMap.set(l.id, id);
    lists.push({ ...l, id, ownerId, projectId, order: l.order ?? i + 1 });
  });

  const tasks: Task[] = [];
  doc.tasks.forEach((t) => {
    const listId = listMap.get(t.listId);
    if (!listId) return;
    const list = lists.find((l) => l.id === listId)!;
    tasks.push({
      ...t,
      id: uid('tsk_'),
      ownerId,
      listId,
      projectId: list.projectId,
      projectName: list.name || t.projectName,
      listName: list.name,
    });
  });

  const inventory: InventoryItem[] = doc.inventory.map((it) => ({
    ...it,
    id: uid('inv_'),
    ownerId,
  }));

  return { projects, lists, tasks, inventory };
}

/** Sanitised profile counters restored from a backup. */
export function profilePatchFromBackup(doc: BackupDocument): Partial<Profile> {
  const p = doc.profile ?? {};
  const num = (v: unknown, fallback = 0) =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return {
    level: Math.max(1, Math.floor(num(p.level, 1))),
    xp: Math.max(0, num(p.xp)),
    egp: Math.max(0, num(p.egp)),
    totalTasks: Math.max(0, Math.floor(num(p.totalTasks))),
    totalFocusMin: Math.max(0, Math.floor(num(p.totalFocusMin))),
    weeklyWeek: typeof p.weeklyWeek === 'string' ? p.weeklyWeek : '',
    weeklyTasks: Math.max(0, Math.floor(num(p.weeklyTasks))),
    weeklyFocusMin: Math.max(0, Math.floor(num(p.weeklyFocusMin))),
    weeklyEgp: Math.max(0, num(p.weeklyEgp)),
    streak: Math.max(0, Math.floor(num(p.streak))),
    lastActiveDay: typeof p.lastActiveDay === 'string' ? p.lastActiveDay : '',
    ...(typeof p.username === 'string' && p.username ? { username: p.username } : {}),
    ...(typeof p.displayName === 'string' && p.displayName ? { displayName: p.displayName } : {}),
    ...(typeof p.avatarColor === 'string' ? { avatarColor: p.avatarColor } : {}),
    ...(typeof p.avatarUrl === 'string' ? { avatarUrl: p.avatarUrl } : {}),
    ...(typeof p.coverUrl === 'string' ? { coverUrl: p.coverUrl } : {}),
  };
}
