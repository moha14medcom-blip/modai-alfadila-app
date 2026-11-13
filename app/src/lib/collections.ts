/* Collection registry + repo contract shared by the local and cloud backends. */

export const PRIVATE_COLLECTIONS = [
  'projects',
  'lists',
  'tasks',
  'inventory',
  'focus_logs',
] as const;
export type PrivateColl = (typeof PRIVATE_COLLECTIONS)[number];

export const SHARED_COLLECTIONS = [
  'profiles',
  'reward_units',
  'reward_requests',
  'store_items',
  'friends',
  'cheers',
  'announcements',
  'settings',
] as const;
export type SharedColl = (typeof SHARED_COLLECTIONS)[number];

export type CollectionId = PrivateColl | SharedColl;

/** Postgres table / storage key names (snake_case). */
export const TABLE_NAMES: Record<CollectionId, string> = {
  projects: 'projects',
  lists: 'lists',
  tasks: 'tasks',
  inventory: 'inventory',
  focus_logs: 'focus_logs',
  profiles: 'profiles',
  reward_units: 'reward_units',
  reward_requests: 'reward_requests',
  store_items: 'store_items',
  friends: 'friends',
  cheers: 'cheers',
  announcements: 'announcements',
  settings: 'settings',
};

/** Minimal row shape. `data` carries JSON payloads (e.g. the `settings` table). */
export interface Entity {
  id: string;
  data?: unknown;
}

export interface Repo {
  readonly mode: 'local' | 'cloud';
  select<T extends Entity>(coll: PrivateColl, ownerId: string): Promise<T[]>;
  selectShared<T extends Entity>(coll: SharedColl): Promise<T[]>;
  getShared<T extends Entity>(coll: SharedColl, id: string): Promise<T | null>;
  insert<T extends Entity>(coll: PrivateColl, ownerId: string, row: T): Promise<T>;
  insertShared<T extends Entity>(coll: SharedColl, row: T): Promise<T>;
  upsert<T extends Entity>(coll: PrivateColl, ownerId: string, row: T): Promise<T>;
  upsertShared<T extends Entity>(coll: SharedColl, row: T): Promise<T>;
  update(coll: PrivateColl, ownerId: string, id: string, patch: object): Promise<void>;
  updateShared(coll: SharedColl, id: string, patch: object): Promise<void>;
  remove(coll: PrivateColl, ownerId: string, id: string): Promise<void>;
  removeShared(coll: SharedColl, id: string): Promise<void>;
}

export type OpKind = 'insert' | 'upsert' | 'update' | 'delete';

/** A single write intent, applied locally and (when possible) pushed to Supabase. */
export interface Op {
  qid: string;
  kind: OpKind;
  coll: CollectionId;
  shared: boolean;
  ownerId: string;
  id: string;
  row?: Entity;
  patch?: object;
  at: number;
}

export function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

export function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function rowOut(obj: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined) return;
    out[toSnake(k)] = v;
  });
  return out;
}

export function rowIn<T extends Entity>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  Object.entries(row).forEach(([k, v]) => {
    if (k === 'owner_id') return;
    out[toCamel(k)] = v;
  });
  return out as T;
}

export function isNetworkError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return /offline|failed to fetch|network|timeout|timed out|socket|econn|502|503|504|load failed|connection/.test(
    msg
  );
}
