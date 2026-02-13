import { getNetflixContent, isNetflixHost } from './netflix';
import {
  insertPlatformID,
  isSupabaseConfigured
} from './supabaseClient';

// Capture Netflix DOM metadata and insert into platform identifiers.
export const captureNetflixContentUrl = async () => {
  if (!isSupabaseConfigured || !isNetflixHost()) return null;

  const capture = getNetflixContent();

  console.log('[captureNetflixContentUrl] Captured content:', capture);

  if (!capture?.platform || !capture?.platformItemId) {
    console.log('[captureNetflixContentUrl] Missing required fields, skipping upload');
    return null;
  }

  // Simplify URL to just the base Netflix URL with the item ID
  const simplifiedUrl = `https://www.netflix.com/watch/${capture.platformItemId}`;

  console.log('[captureNetflixContentUrl] Attempting to upload platform ID:', {
    platform: capture.platform,
    platformItemId: capture.platformItemId,
    url: simplifiedUrl
  });

  try {
    const result = await insertPlatformID({
      p_platform: capture.platform,
      p_platform_id: capture.platformItemId,
      p_url: simplifiedUrl,
    });
    console.log('[captureNetflixContentUrl] Platform ID upload result:', result);
    return result;
  } catch (error) {
    console.error('[captureNetflixContentUrl] Platform ID upload failed:', error);
    throw error;
  }
};
