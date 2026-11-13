/* Offline-first database facade: local vault + optional Supabase sync + write queue. */

import { LocalRepo } from './localRepo';
import { CloudRepo } from './cloudRepo';
import { supabase } from './supabaseClient';
import { vaultGet, vaultSet } from './storage';
import {
  PRIVATE_COLLECTIONS,
  SHARED_COLLECTIONS,
  isNetworkError,
  type CollectionId,
  type Entity,
  type Op,
  type OpKind,
  type Repo,
  type PrivateColl,
  type SharedColl,
} from './collections';
import { uid } from './formulas';

const QUEUE_KEY = 'sync-queue';

export interface WriteInput {
  kind: OpKind;
  coll: CollectionId;
  shared: boolean;
  ownerId: string;
  id: string;
  row?: Entity;
  patch?: object;
}

export class Database {
  readonly local = new LocalRepo();
  readonly cloud: Repo | null = supabase ? new CloudRepo(supabase) : null;
  queue: Op[] = [];
  private loaded = false;
  private flushing = false;
  onQueue: ((pending: number) => void) | null = null;
  onSyncing: ((syncing: boolean) => void) | null = null;

  get cloudMode(): boolean {
    return this.cloud !== null;
  }

  get pending(): number {
    return this.queue.length;
  }

  async loadQueue(): Promise<void> {
    if (this.loaded) return;
    this.queue = (await vaultGet<Op[]>(QUEUE_KEY)) ?? [];
    this.loaded = true;
    this.onQueue?.(this.queue.length);
  }

  private async saveQueue(): Promise<void> {
    await vaultSet(QUEUE_KEY, this.queue);
    this.onQueue?.(this.queue.length);
  }

  /** Applies a write locally (immediately) and mirrors it to Supabase when possible. */
  async write(input: WriteInput): Promise<{ queued: boolean }> {
    const op: Op = { ...input, qid: uid('op_'), at: Date.now() };
    await this.applyLocal(op);

    const cloud = this.cloud;
    if (!cloud) return { queued: false };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await this.enqueue(op);
      return { queued: true };
    }
    try {
      await this.push(cloud, op);
      return { queued: false };
    } catch (err) {
      if (isNetworkError(err)) {
        await this.enqueue(op);
        return { queued: true };
      }
      throw err;
    }
  }

  private async applyLocal(op: Op): Promise<void> {
    const local = this.local;
    if (op.shared) {
      const coll = op.coll as SharedColl;
      if (op.kind === 'insert') await local.insertShared(coll, op.row!);
      else if (op.kind === 'upsert') await local.upsertShared(coll, op.row!);
      else if (op.kind === 'update') await local.updateShared(coll, op.id, op.patch ?? {});
      else await local.removeShared(coll, op.id);
      return;
    }
    const coll = op.coll as PrivateColl;
    if (op.kind === 'insert') await local.insert(coll, op.ownerId, op.row!);
    else if (op.kind === 'upsert') await local.upsert(coll, op.ownerId, op.row!);
    else if (op.kind === 'update') await local.update(coll, op.ownerId, op.id, op.patch ?? {});
    else await local.remove(coll, op.ownerId, op.id);
  }

  private async push(cloud: Repo, op: Op): Promise<void> {
    if (op.shared) {
      const coll = op.coll as SharedColl;
      if (op.kind === 'insert') await cloud.insertShared(coll, op.row!);
      else if (op.kind === 'upsert') await cloud.upsertShared(coll, op.row!);
      else if (op.kind === 'update') await cloud.updateShared(coll, op.id, op.patch ?? {});
      else await cloud.removeShared(coll, op.id);
      return;
    }
    const coll = op.coll as PrivateColl;
    if (op.kind === 'insert') await cloud.insert(coll, op.ownerId, op.row!);
    else if (op.kind === 'upsert') await cloud.upsert(coll, op.ownerId, op.row!);
    else if (op.kind === 'update') await cloud.update(coll, op.ownerId, op.id, op.patch ?? {});
    else await cloud.remove(coll, op.ownerId, op.id);
  }

  private async enqueue(op: Op): Promise<void> {
    this.queue.push(op);
    await this.saveQueue();
  }

  /** Replays queued writes; stops on a network failure, drops permanently-failing ops. */
  async flush(): Promise<number> {
    const cloud = this.cloud;
    if (!cloud || this.flushing) return this.queue.length;
    await this.loadQueue();
    if (!this.queue.length) return 0;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return this.queue.length;

    this.flushing = true;
    this.onSyncing?.(true);
    const batch = [...this.queue];
    const remaining: Op[] = [];
    try {
      for (let i = 0; i < batch.length; i += 1) {
        const op = batch[i];
        try {
          await this.push(cloud, op);
        } catch (err) {
          if (isNetworkError(err)) {
            remaining.push(...batch.slice(i));
            break;
          }
          // invalid op (RLS / constraint) — drop it so the queue never stalls
          console.warn('dropped unsyncable op', op.coll, err);
        }
      }
      this.queue = remaining;
      await this.saveQueue();
    } finally {
      this.flushing = false;
      this.onSyncing?.(false);
    }
    return this.queue.length;
  }

  /** Pulls the cloud state into the local vault (login / refresh). */
  async pullAll(ownerId: string): Promise<void> {
    const cloud = this.cloud;
    if (!cloud) return;
    for (const coll of PRIVATE_COLLECTIONS) {
      const rows = await cloud.select<Entity>(coll, ownerId);
      await this.local.write(coll, ownerId, rows);
    }
    for (const coll of SHARED_COLLECTIONS) {
      const rows = await cloud.selectShared<Entity>(coll);
      await this.local.writeShared(coll, rows);
    }
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
  }
}

export const db = new Database();
