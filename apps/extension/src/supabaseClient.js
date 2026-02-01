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

// Minimal RPC wrapper for external identifier touch.
export const touchExternalIdentifier = async ({
  platform,
  externalId,
  url,
  title,
  yearPublished
}) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  const payload = {
    p_platform: platform || null,
    p_external_id: externalId || null,
    p_url: url || null,
    p_title: title || null,
    p_year_published: yearPublished || null
  };

  const clients = [contentCatalog, supabase];
  let missingError = null;

  for (const client of clients) {
    try {
      const { data, error } = await client.rpc('touch_external_identifier', payload);
      if (error) throw error;
      return data ?? null;
    } catch (error) {
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

export const insertExternalIdentifier = async (payload) => {
  // Not implemented: temp shim that only runs the RPC.
  return touchExternalIdentifier({
    platform: payload?.platform,
    externalId: payload?.externalIdentifier || payload?.externalId,
    url: payload?.url,
    title: payload?.title,
    yearPublished: payload?.yearPublished
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
export const fetchContentExternalId = async () => notImplemented('fetchContentExternalId');
export const insertContentExternalId = async () => notImplemented('insertContentExternalId');
export const upsertContentExternalIdLink = async () =>
  notImplemented('upsertContentExternalIdLink');
export const fetchContentMetadataTmdbId = async () =>
  notImplemented('fetchContentMetadataTmdbId');
export const getViewerId = () => notImplemented('getViewerId');
