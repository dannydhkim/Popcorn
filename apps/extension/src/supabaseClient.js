import { createClient } from '@supabase/supabase-js';

// Environment-based config for Supabase access.
const supabaseUrl = 'https://avkhnanzljzfhdymsxwa.supabase.co';
const supabaseAnonKey = 'sb_publishable_mODMOQ1HYxqLHvKuCwv3iw_OCSXKtFt'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Use a stateless client because the extension does not need auth sessions.
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Stable local viewer identifier for voting and attribution.
const viewerKey = 'popcorn_viewer_id';
// Detect missing schema errors for optional tables.
const isMissingRelation = (error) =>
  error?.code === '42P01' ||
  error?.message?.includes('does not exist') ||
  error?.message?.includes('relation');

// Get or create a pseudo-anonymous id in localStorage.
export const getViewerId = () => {
  try {
    const cached = window.localStorage.getItem(viewerKey);
    if (cached) return cached;
    const generated =
      (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
      `viewer_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(viewerKey, generated);
    return generated;
  } catch (error) {
    return `viewer_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
};

// Find or create a thread row for the current content key.
export const ensureThread = async ({
  contentKey,
  contentTitle,
  contentUrl,
  contentProvider,
  contentProviderId,
  tmdbMetadata
}) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  // Attempt to load an existing thread before inserting.
  const { data: existing, error } = await supabase
    .from('threads')
    .select('*')
    .eq('content_key', contentKey)
    .maybeSingle();

  if (error) throw error;
  if (existing) return existing;

  // Full insert payload for newer schemas.
  const payload = {
    content_key: contentKey,
    content_title: contentTitle,
    content_url: contentUrl,
    content_provider: contentProvider,
    content_provider_id: contentProviderId,
    tmdb_metadata: tmdbMetadata || null
  };

  const { data: created, error: insertError } = await supabase
    .from('threads')
    .insert(payload)
    .select('*')
    .single();

  // Fallback for older schemas missing new columns.
  const missingColumn =
    insertError?.code === '42703' ||
    insertError?.code === 'PGRST204' ||
    insertError?.message?.includes('column');

  if (missingColumn) {
    const { data: fallback, error: fallbackError } = await supabase
      .from('threads')
      .insert({
        content_key: contentKey,
        content_title: contentTitle,
        content_url: contentUrl
      })
      .select('*')
      .single();

    if (fallbackError) throw fallbackError;
    return fallback;
  }

  if (insertError) throw insertError;
  return created;
};

// Load the latest comments for a thread.
export const fetchComments = async (threadId) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Insert a new comment record.
export const createComment = async ({ threadId, body, parentId = null }) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  // Generate a simple display name based on the local id.
  const authorId = getViewerId();

  const { data, error } = await supabase
    .from('comments')
    .insert({
      thread_id: threadId,
      body,
      parent_id: parentId,
      author_id: authorId,
      author_label: `Viewer ${authorId.slice(-4)}`,
      score: 0
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Update the cached score for a comment.
export const updateCommentScore = async ({ commentId, score }) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('comments')
    .update({ score })
    .eq('id', commentId)
    .select('id, score')
    .single();

  if (error) throw error;
  return data;
};

// Resolve the catalog entry mapped to a provider id.
export const fetchContentCatalog = async ({ provider, providerId }) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('content_mappings')
    .select('id, content_catalog:content_catalog_id(*)')
    .eq('provider', provider)
    .eq('provider_id', providerId)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }

  return data?.content_catalog || null;
};

// Insert a catalog entry based on TMDB data, or return an existing one.
export const upsertContentCatalogFromTmdb = async (tmdbMetadata) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  if (!tmdbMetadata?.id || !tmdbMetadata?.mediaType) {
    throw new Error('TMDB metadata is missing required fields.');
  }

  const { data: existing, error: fetchError } = await supabase
    .from('content_catalog')
    .select('*')
    .eq('tmdb_id', tmdbMetadata.id)
    .eq('tmdb_type', tmdbMetadata.mediaType)
    .maybeSingle();

  if (fetchError) {
    if (isMissingRelation(fetchError)) return null;
    throw fetchError;
  }

  if (existing) return existing;

  // Shape the TMDB metadata into catalog columns.
  const payload = {
    tmdb_id: tmdbMetadata.id,
    tmdb_type: tmdbMetadata.mediaType,
    title: tmdbMetadata.title || tmdbMetadata.originalTitle || 'Untitled',
    year: tmdbMetadata.year || null,
    genres: tmdbMetadata.genres || [],
    overview: tmdbMetadata.overview || null,
    poster_url: tmdbMetadata.posterPath || null,
    rating: tmdbMetadata.rating,
    vote_count: tmdbMetadata.voteCount,
    tmdb_metadata: tmdbMetadata
  };

  const { data, error } = await supabase
    .from('content_catalog')
    .insert(payload)
    .select('*')
    .single();

  // Unique constraint safety net for concurrent inserts.
  if (error?.code === '23505') {
    const { data: fallback, error: fallbackError } = await supabase
      .from('content_catalog')
      .select('*')
      .eq('tmdb_id', tmdbMetadata.id)
      .eq('tmdb_type', tmdbMetadata.mediaType)
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    return fallback;
  }

  if (error) throw error;
  return data;
};

// Upsert the mapping between provider id and catalog entry.
export const confirmContentMapping = async ({
  provider,
  providerId,
  contentCatalogId,
  viewerId,
  tmdbMetadata
}) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  const payload = {
    provider,
    provider_id: providerId,
    content_catalog_id: contentCatalogId,
    confirmed_by: viewerId,
    confirmed_at: new Date().toISOString(),
    tmdb_snapshot: tmdbMetadata || null
  };

  const { data, error } = await supabase
    .from('content_mappings')
    .upsert(payload, { onConflict: 'provider,provider_id' })
    .select('*')
    .single();

  if (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }

  return data;
};
