import { vaultGet, vaultSet } from './storage';
import type { Entity, PrivateColl, Repo, SharedColl } from './collections';

const privateKey = (coll: PrivateColl, ownerId: string) => `data::${coll}::${ownerId}`;
const sharedKey = (coll: SharedColl) => `shared::${coll}`;

/**
 * Local (offline-first) backend. Everything lives in the IndexedDB vault, so the
 * whole product works with zero configuration. It is also the cache that the
 * cloud backend mirrors into.
 */
export class LocalRepo implements Repo {
  readonly mode = 'local' as const;

  async read<T extends Entity>(coll: PrivateColl, ownerId: string): Promise<T[]> {
    return (await vaultGet<T[]>(privateKey(coll, ownerId))) ?? [];
  }

  async readShared<T extends Entity>(coll: SharedColl): Promise<T[]> {
    return (await vaultGet<T[]>(sharedKey(coll))) ?? [];
  }

  async write<T extends Entity>(coll: PrivateColl, ownerId: string, rows: T[]): Promise<void> {
    await vaultSet(privateKey(coll, ownerId), rows);
  }

  async writeShared<T extends Entity>(coll: SharedColl, rows: T[]): Promise<void> {
    await vaultSet(sharedKey(coll), rows);
  }

  async select<T extends Entity>(coll: PrivateColl, ownerId: string): Promise<T[]> {
    return this.read<T>(coll, ownerId);
  }

  async selectShared<T extends Entity>(coll: SharedColl): Promise<T[]> {
    return this.readShared<T>(coll);
  }

  async getShared<T extends Entity>(coll: SharedColl, id: string): Promise<T | null> {
    const rows = await this.readShared<T>(coll);
    return rows.find((r) => r.id === id) ?? null;
  }

  async insert<T extends Entity>(coll: PrivateColl, ownerId: string, row: T): Promise<T> {
    const rows = await this.read<T>(coll, ownerId);
    const next = [row, ...rows.filter((r) => r.id !== row.id)];
    await this.write(coll, ownerId, next);
    return row;
  }

  async insertShared<T extends Entity>(coll: SharedColl, row: T): Promise<T> {
    const rows = await this.readShared<T>(coll);
    const next = [row, ...rows.filter((r) => r.id !== row.id)];
    await this.writeShared(coll, next);
    return row;
  }

  async upsert<T extends Entity>(coll: PrivateColl, ownerId: string, row: T): Promise<T> {
    const rows = await this.read<T>(coll, ownerId);
    const idx = rows.findIndex((r) => r.id === row.id);
    const next = idx >= 0 ? rows.map((r) => (r.id === row.id ? row : r)) : [row, ...rows];
    await this.write(coll, ownerId, next);
    return row;
  }

  async upsertShared<T extends Entity>(coll: SharedColl, row: T): Promise<T> {
    const rows = await this.readShared<T>(coll);
    const idx = rows.findIndex((r) => r.id === row.id);
    const next = idx >= 0 ? rows.map((r) => (r.id === row.id ? row : r)) : [row, ...rows];
    await this.writeShared(coll, next);
    return row;
  }

  async update(coll: PrivateColl, ownerId: string, id: string, patch: object): Promise<void> {
    const rows = await this.read(coll, ownerId);
    await this.write(
      coll,
      ownerId,
      rows.map((r) => (r.id === id ? { ...r, ...(patch as Record<string, unknown>) } : r))
    );
  }

  async updateShared(coll: SharedColl, id: string, patch: object): Promise<void> {
    const rows = await this.readShared(coll);
    await this.writeShared(
      coll,
      rows.map((r) => (r.id === id ? { ...r, ...(patch as Record<string, unknown>) } : r))
    );
  }

  async remove(coll: PrivateColl, ownerId: string, id: string): Promise<void> {
    const rows = await this.read(coll, ownerId);
    await this.write(
      coll,
      ownerId,
      rows.filter((r) => r.id !== id)
    );
  }

  async removeShared(coll: SharedColl, id: string): Promise<void> {
    const rows = await this.readShared(coll);
    await this.writeShared(
      coll,
      rows.filter((r) => r.id !== id)
    );
  }
}
