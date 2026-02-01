import { getDisneyContent, isDisneyHost } from './disney';
import { getNetflixContent, isNetflixHost } from './netflix';
import { getTmdbMetadata, isTmdbConfigured } from './tmdb';
import {
  fetchContentExternalId,
  fetchContentMetadata,
  insertContentExternalId,
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

const EXTERNAL_ID_CACHE = new Map();
const UNRESOLVED_EXTERNAL_IDS = new Map();

const buildExternalIdKey = (source, externalId) =>
  source && externalId ? `${source}:${externalId}` : '';

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

export const markExternalIdResolved = ({ source, externalId, contentId }) => {
  const key = buildExternalIdKey(source, externalId);
  if (!key || !contentId) return;
  const existing = EXTERNAL_ID_CACHE.get(key);
  EXTERNAL_ID_CACHE.set(key, {
    ...(existing || {}),
    source,
    external_id: externalId,
    content_id: contentId
  });
  UNRESOLVED_EXTERNAL_IDS.delete(key);
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
  const externalKey = buildExternalIdKey(source, platformItemId);
  const attachExternal = (payload) => ({
    ...payload,
    externalIdRecord: externalKey ? EXTERNAL_ID_CACHE.get(externalKey) : null,
    externalIdNeedsMatch: externalKey
      ? UNRESOLVED_EXTERNAL_IDS.has(externalKey)
      : false
  });

  let existing = null;
  if (isSupabaseConfigured) {
    if (externalKey && !EXTERNAL_ID_CACHE.has(externalKey)) {
      try {
        const externalRecord =
          (await fetchContentExternalId({
            source,
            externalId: platformItemId
          })) ||
          (await insertContentExternalId({
            source,
            externalId: platformItemId,
            url: content.url
          }));
        EXTERNAL_ID_CACHE.set(externalKey, externalRecord || null);
        if (externalRecord && !externalRecord.content_id) {
          UNRESOLVED_EXTERNAL_IDS.set(externalKey, externalRecord);
        }
      } catch (error) {
        EXTERNAL_ID_CACHE.set(externalKey, null);
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
        return attachExternal({ ...content, tmdb: existing.tmdb_metadata });
      }
    }
  }

  if (!isTmdbConfigured) {
    return attachExternal({ ...content, tmdb: existing?.tmdb_metadata || null });
  }

  const metadata = await getTmdbMetadata(content);
  if (!metadata) {
    return attachExternal({ ...content, tmdb: existing?.tmdb_metadata || null });
  }

  return attachExternal({ ...content, tmdb: metadata });
};
