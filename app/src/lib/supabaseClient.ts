/* Clean Supabase integration: Auth + PostgreSQL + Storage.
   When the env vars are absent the app runs in LOCAL MODE (no sign-in needed). */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

/** True only when both env values look usable — without them we stay offline/local. */
export const isCloudEnabled: boolean =
  url.startsWith('http') && anonKey.length > 20 && !anonKey.includes('your-');

export const supabase: SupabaseClient | null = isCloudEnabled
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'maddei.supabase.auth',
      },
    })
  : null;

export const STORAGE_BUCKET = 'media';

/** Uploads a file to Supabase Storage and returns its public URL. */
export async function uploadMedia(
  client: SupabaseClient,
  userId: string,
  file: File,
  folder: 'avatars' | 'covers'
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().slice(0, 5);
  const path = `${userId}/${folder}-${Date.now()}.${ext}`;
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '31536000',
    contentType: file.type || 'image/png',
  });
  if (error) throw error;
  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Reads a file as a data URL — used for avatars in local mode. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}
