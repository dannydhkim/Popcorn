import { getDisneyContent, isDisneyHost } from './disney';
import { getNetflixContent, isNetflixHost } from './netflix';
import { getTmdbMetadata, isTmdbConfigured } from './tmdb';
import {
  fetchContentPlatformId,
  fetchContentMetadata,
  insertContentPlatformId,
  isSupabaseConfigured
} from './supabaseClient';

// Provider registry used to identify the active streaming site.
const PROVIDERS = [
  {
    id: 'netflix',
    match: isNetflixHost,
    getContent: getNetflixContent,
    label: 'Netflix'
  },
  {
    id: 'disney',
    match: isDisneyHost,
    getContent: getDisneyContent,
    label: 'Disney+'
  }
];

const PLATFORM_ID_CACHE = new Map();
const UNRESOLVED_PLATFORM_IDS = new Map();

const buildPlatformIdKey = (source, platformId) =>
  source && platformId ? `${source}:${platformId}` : '';

const normalizePlatformRecord = (record) => {
  if (!record) return null;
  const { external_id: externalId, platform_id: platformId, ...rest } = record;
  return {
    ...rest,
    platform_id: platformId ?? externalId ?? null
  };
};

const normalizeContent = (content, provider) => {
  if (!content) return null;
  const platformItemId = content.platformItemId || null;
  const providerValue =
    content.provider || provider?.id || content.platform || null;
  const key =
    content.key ||
    (providerValue && platformItemId ? `${providerValue}:${platformItemId}` : '');
  const providerType = content.providerType || content.type || null;

  return {
    ...content,
    key: content.key || key,
    provider: providerValue,
    platformItemId,
    providerType: providerType || content.providerType || null
  };
};

// Resolve a human-friendly label from the provider id.
export const getProviderLabel = (providerKey) => {
  const provider = PROVIDERS.find((item) => item.id === providerKey);
  return provider?.label || 'Unknown';
};

export const markPlatformIdResolved = ({ source, platformId, contentId }) => {
  const key = buildPlatformIdKey(source, platformId);
  if (!key || !contentId) return;
  const existing = PLATFORM_ID_CACHE.get(key);
  PLATFORM_ID_CACHE.set(key, {
    ...(existing || {}),
    source,
    platform_id: platformId,
    content_id: contentId
  });
  UNRESOLVED_PLATFORM_IDS.delete(key);
};

// Detect the current page and return the associated content data.
export const getActiveContent = () => {
  const hostname = window.location.hostname;
  const provider = PROVIDERS.find((item) => item.match(hostname));
  if (!provider) return null;
  return normalizeContent(provider.getContent(), provider);
};

// Attach TMDB metadata to the content record when available.
export const enrichContentWithTmdb = async (content) => {
  if (!content) return null;
  const platformItemId = content.platformItemId || null;
  const source = content.provider || content.platform || null;
  const platformKey = buildPlatformIdKey(source, platformItemId);
  const attachPlatformId = (payload) => ({
    ...payload,
    platformIdRecord: platformKey ? PLATFORM_ID_CACHE.get(platformKey) : null,
    platformIdNeedsMatch: platformKey
      ? UNRESOLVED_PLATFORM_IDS.has(platformKey)
      : false
  });

  let existing = null;
  if (isSupabaseConfigured) {
    if (platformKey && !PLATFORM_ID_CACHE.has(platformKey)) {
      try {
        const platformRecord =
          (await fetchContentPlatformId({
            source,
            platformId: platformItemId
          })) ||
          (await insertContentPlatformId({
            source,
            platformId: platformItemId,
            url: content.url
          }));
        const normalizedRecord = normalizePlatformRecord(platformRecord);
        PLATFORM_ID_CACHE.set(platformKey, normalizedRecord);
        if (normalizedRecord && !normalizedRecord.content_id) {
          UNRESOLVED_PLATFORM_IDS.set(platformKey, normalizedRecord);
        }
      } catch (error) {
        PLATFORM_ID_CACHE.set(platformKey, null);
      }
    }

    try {
      existing = await fetchContentMetadata({
        url: content.url,
        platform: content.provider,
        platformItemId
      });
    } catch (error) {
      existing = null;
    }

    if (existing?.tmdb_metadata) {
      const hasExternalIds = Boolean(
        existing.imdb_id ||
          existing.wikidata_id ||
          existing.tmdb_metadata?.imdbId ||
          existing.tmdb_metadata?.wikidataId
      );
      if (hasExternalIds || !isTmdbConfigured) {
        return attachPlatformId({ ...content, tmdb: existing.tmdb_metadata });
      }
    }
  }

  if (!isTmdbConfigured) {
    return attachPlatformId({ ...content, tmdb: existing?.tmdb_metadata || null });
  }

  const metadata = await getTmdbMetadata(content);
  if (!metadata) {
    return attachPlatformId({ ...content, tmdb: existing?.tmdb_metadata || null });
  }

  return attachPlatformId({ ...content, tmdb: metadata });
};
