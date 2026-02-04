import { getNetflixContent, isNetflixHost } from './netflix';
import {
  fetchContentMetadataTmdbId,
  insertPlatformID,
  isSupabaseConfigured
} from './supabaseClient';

// Capture Netflix DOM metadata and insert into platform identifiers.
export const captureNetflixContentUrl = async () => {
  if (!isSupabaseConfigured || !isNetflixHost()) return null;

  const capture = getNetflixContent();
  if (!capture?.url || !capture.platform || !capture.platformItemId) return null;

  const tmdbId = await fetchContentMetadataTmdbId({
    platform: capture.platform,
    platformItemId: capture.platformItemId
  });

  return insertPlatformID({
    p_platform: capture.platform,
    p_platform_id: capture.platformItemId,
    p_url: capture.url,
  });
};
