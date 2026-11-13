import type { SupabaseClient } from '@supabase/supabase-js';
import {
  TABLE_NAMES,
  rowIn,
  rowOut,
  type Entity,
  type PrivateColl,
  type Repo,
  type SharedColl,
} from './collections';

/**
 * Supabase (PostgreSQL) backend. Private collections are owner-scoped via the
 * `owner_id` column; shared collections are app-wide rows keyed by `id`.
 */
export class CloudRepo implements Repo {
  readonly mode = 'cloud' as const;

  constructor(private client: SupabaseClient) {}

  private table(coll: PrivateColl | SharedColl) {
    return this.client.from(TABLE_NAMES[coll]);
  }

  async select<T extends Entity>(coll: PrivateColl, ownerId: string): Promise<T[]> {
    const { data, error } = await this.table(coll).select('*').eq('owner_id', ownerId);
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((r) => rowIn<T>(r));
  }

  async selectShared<T extends Entity>(coll: SharedColl): Promise<T[]> {
    const { data, error } = await this.table(coll).select('*');
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((r) => rowIn<T>(r));
  }

  async getShared<T extends Entity>(coll: SharedColl, id: string): Promise<T | null> {
    const { data, error } = await this.table(coll).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowIn<T>(data as Record<string, unknown>) : null;
  }

  async insert<T extends Entity>(coll: PrivateColl, ownerId: string, row: T): Promise<T> {
    const { error } = await this.table(coll).insert(rowOut({ ...row, ownerId }));
    if (error) throw error;
    return row;
  }

  async insertShared<T extends Entity>(coll: SharedColl, row: T): Promise<T> {
    const { error } = await this.table(coll).insert(rowOut(row));
    if (error) throw error;
    return row;
  }

  async upsert<T extends Entity>(coll: PrivateColl, ownerId: string, row: T): Promise<T> {
    const { error } = await this.table(coll).upsert(rowOut({ ...row, ownerId }));
    if (error) throw error;
    return row;
  }

  async upsertShared<T extends Entity>(coll: SharedColl, row: T): Promise<T> {
    const { error } = await this.table(coll).upsert(rowOut(row));
    if (error) throw error;
    return row;
  }

  async update(coll: PrivateColl, ownerId: string, id: string, patch: object): Promise<void> {
    const { error } = await this.table(coll)
      .update(rowOut(patch as Record<string, unknown>))
      .eq('id', id)
      .eq('owner_id', ownerId);
    if (error) throw error;
  }

  async updateShared(coll: SharedColl, id: string, patch: object): Promise<void> {
    const { error } = await this.table(coll)
      .update(rowOut(patch as Record<string, unknown>))
      .eq('id', id);
    if (error) throw error;
  }

  async remove(coll: PrivateColl, ownerId: string, id: string): Promise<void> {
    const { error } = await this.table(coll).delete().eq('id', id).eq('owner_id', ownerId);
    if (error) throw error;
  }

  async removeShared(coll: SharedColl, id: string): Promise<void> {
    const { error } = await this.table(coll).delete().eq('id', id);
    if (error) throw error;
  }
}
