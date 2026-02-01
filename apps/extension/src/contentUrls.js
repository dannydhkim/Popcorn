import { getNetflixDomCapture, isNetflixHost } from './netflix';
import {
  fetchContentMetadataTmdbId,
  insertExternalIdentifier,
  isSupabaseConfigured
} from './supabaseClient';

// Capture Netflix DOM metadata and insert into external_identifiers.
export const captureNetflixContentUrl = async () => {
  if (!isSupabaseConfigured || !isNetflixHost()) return null;

  const capture = getNetflixDomCapture();
  if (!capture?.url || !capture.platform || !capture.platformItemId) return null;

  const tmdbId = await fetchContentMetadataTmdbId({
    platform: capture.platform,
    platformItemId: capture.platformItemId
  });

  return insertExternalIdentifier({
    title: capture.title,
    yearPublished: capture.yearPublished,
    url: capture.url,
    platform: capture.platform,
    externalIdentifier: capture.platformItemId,
    tmdbId
  });
};
