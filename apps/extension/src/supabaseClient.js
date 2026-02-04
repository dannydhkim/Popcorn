import { createClient } from '@supabase/supabase-js';

// Minimal Supabase client setup.
const supabaseUrl = 'https://avkhnanzljzfhdymsxwa.supabase.co';
const supabaseAnonKey = 'sb_publishable_mODMOQ1HYxqLHvKuCwv3iw_OCSXKtFt';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const createStorageAdapter = () => {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return {
      getItem: (key) =>
        new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            resolve(result?.[key] ?? null);
          });
        }),
      setItem: (key, value) =>
        new Promise((resolve) => {
          chrome.storage.local.set({ [key]: value }, () => resolve());
        }),
      removeItem: (key) =>
        new Promise((resolve) => {
          chrome.storage.local.remove([key], () => resolve());
        })
    };
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    return {
      getItem: (key) => Promise.resolve(window.localStorage.getItem(key)),
      setItem: (key, value) => {
        window.localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key) => {
        window.localStorage.removeItem(key);
        return Promise.resolve();
      }
    };
  }

  return undefined;
};

const storage = createStorageAdapter();

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage
  }
});

const shouldDebugRpc = () => {
  // if (typeof globalThis === 'undefined') return false;
  // if (globalThis.__POPCORN_DEBUG_RPC__ === true) return true;

  // try {
  //   return globalThis.localStorage?.getItem('popcorn:debug-rpc') === 'true';
  // } catch (error) {
  //   return false;
  // }
  return true
};

const debugRpc = (stage, details) => {
  if (!shouldDebugRpc()) return;
  console.debug(`[supabase][rpc] ${stage}`, details);
  if (details?.error) {
    console.error('[supabase][rpc] error', details.error);
    debugger;
  }
};

const contentCatalog =
  typeof supabase.schema === 'function' ? supabase.schema('content_catalog') : supabase;

const isMissingFunction = (error) =>
  error?.code === '42883' ||
  error?.code === 'PGRST202' ||
  (error?.message?.includes('function') && error?.message?.includes('does not exist')) ||
  error?.message?.includes('Could not find the function');

const notImplemented = (name) => {
  const message = `${name} is not implemented`;
  // Not implemented: stub for future integration.
  console.warn(message);
  throw new Error(message);
};

// Minimal RPC wrapper for Platform ID touch.
export const touchPlatformID = async ({
  platform,
  platformId,
  url
}) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  const payload = {
    p_platform: platform || null,
    p_platform_id: platformId || null,
    p_url: url || null
  };

  const clients = [contentCatalog, supabase];
  let missingError = null;

  debugRpc('start', { payload });

  for (const client of clients) {
    try {
      const schema = client === contentCatalog ? 'content_catalog' : 'public';
      debugRpc('attempt', { schema });
      const { data, error } = await client.rpc('touch_platform_ids', payload);
      if (error) throw error;
      debugRpc('success', { schema, data });
      return data ?? null;
    } catch (error) {
      const schema = client === contentCatalog ? 'content_catalog' : 'public';
      debugRpc('error', { schema, error });
      if (isMissingFunction(error)) {
        missingError = error;
        continue;
      }
      throw error;
    }
  }

  if (missingError) throw missingError;
  return null;
};

export const insertPlatformID = async (payload) => {
  // Not implemented: temp shim that only runs the RPC.
  return touchPlatformID({
    p_platform: payload?.p_platform,
    p_platform_id: payload?.p_platform_id,
    p_url: payload?.p_url
  });
};

// ---- Temporary stubs (not implemented) ----
export const ensureThread = async () => notImplemented('ensureThread');
export const fetchComments = async () => notImplemented('fetchComments');
export const createComment = async () => notImplemented('createComment');
export const updateCommentScore = async () => notImplemented('updateCommentScore');
export const fetchContentCatalog = async () => notImplemented('fetchContentCatalog');
export const upsertContentCatalogFromTmdb = async () =>
  notImplemented('upsertContentCatalogFromTmdb');
export const confirmContentMapping = async () => notImplemented('confirmContentMapping');
export const upsertContentMetadata = async () => notImplemented('upsertContentMetadata');
export const fetchContentMetadata = async () => notImplemented('fetchContentMetadata');
export const fetchContentPlatformId = async () => notImplemented('fetchContentPlatformId');
export const insertContentPlatformId = async () => notImplemented('insertContentPlatformId');
export const upsertContentPlatformIdLink = async () =>
  notImplemented('upsertContentPlatformIdLink');
export const fetchContentMetadataTmdbId = async () =>
  notImplemented('fetchContentMetadataTmdbId');
export const getViewerId = () => notImplemented('getViewerId');
