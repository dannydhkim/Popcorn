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
  if (typeof globalThis === 'undefined') return false;
  if (globalThis.__POPCORN_DEBUG_RPC__ === true) return true;

  try {
    return globalThis.localStorage?.getItem('popcorn:debug-rpc') === 'true';
  } catch (error) {
    return false;
  }
};

const debugRpc = (stage, details) => {
  if (!shouldDebugRpc()) return;
  console.log(`[supabase][rpc] ${stage}`, details);
  if (details?.error) {
    console.error('[supabase][rpc] error', details.error);
    debugger;
  }
};

const contentCatalog =
  typeof supabase.schema === 'function' ? supabase.schema('content_catalog') : supabase;

const notImplemented = (name) => {
  const message = `${name} is not implemented`;
  // Not implemented: stub for future integration.
  console.warn(message);
  throw new Error(message);
};

// Minimal RPC wrapper for Platform ID touch.
export const touchPlatformID = async ({
  p_platform,
  p_platform_id,
  p_url
}) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  const payload = {
    p_platform: p_platform || null,
    p_platform_id: p_platform_id || null,
    p_url: p_url || null
  };

  debugRpc('start', { payload });

  try {
    debugRpc('attempt', { schema: 'content_catalog' });
    const result = await contentCatalog.rpc('touch_platform_ids', payload);
    const { data, error } = result;
    if (error) throw error;
    debugRpc('success', { schema: 'content_catalog', data });
    return data ?? null;
  } catch (error) {
    debugRpc('error', { schema: 'content_catalog', error });
    throw error;
  }
};

export const insertPlatformID = async (payload) => {
  // Not implemented: temp shim that only runs the RPC.
  return touchPlatformID({
    p_platform: payload?.p_platform,
    p_platform_id: payload?.p_platform_id,
    p_url: payload?.p_url
  });
};

// Fetch content metadata by content_id from content_catalog.content table
export const fetchContentById = async (contentId) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  if (!contentId) return null;

  try {
    const { data, error } = await contentCatalog
      .from('content')
      .select('*')
      .eq('content_id', contentId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[supabase] fetchContentById failed:', error);
    return null;
  }
};

// Insert a vote for content matching
export const insertContentVote = async ({
  platform,
  platformId,
  tmdbId,
  mediaType
}) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  try {
    const { data, error } = await contentCatalog
      .from('content_platform_id_votes')
      .insert({
        platform,
        platform_id: platformId,
        tmdb_id: tmdbId,
        media_type: mediaType
      })
      .select()
      .single();

    if (error) throw error;
    console.log('[supabase] Vote inserted:', data);
    return data;
  } catch (error) {
    console.error('[supabase] insertContentVote failed:', error);
    throw error;
  }
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
