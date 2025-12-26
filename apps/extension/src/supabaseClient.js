import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

const viewerKey = 'popcorn_viewer_id';
const isMissingRelation = (error) =>
  error?.code === '42P01' ||
  error?.message?.includes('does not exist') ||
  error?.message?.includes('relation');

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

export const ensureThread = async ({
  contentKey,
  contentTitle,
  contentUrl,
  contentProvider,
  contentProviderId,
  tmdbMetadata
}) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  const { data: existing, error } = await supabase
    .from('threads')
    .select('*')
    .eq('content_key', contentKey)
    .maybeSingle();

  if (error) throw error;
  if (existing) return existing;

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

export const createComment = async ({ threadId, body, parentId = null }) => {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

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
