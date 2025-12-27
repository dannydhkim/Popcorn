import { getDisneyContent, isDisneyHost } from './disney';
import { getNetflixContent, isNetflixHost } from './netflix';
import { getTmdbMetadata, isTmdbConfigured } from './tmdb';

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

// Resolve a human-friendly label from the provider id.
export const getProviderLabel = (providerId) => {
  const provider = PROVIDERS.find((item) => item.id === providerId);
  return provider?.label || 'Unknown';
};

// Detect the current page and return the associated content data.
export const getActiveContent = () => {
  const hostname = window.location.hostname;
  const provider = PROVIDERS.find((item) => item.match(hostname));
  if (!provider) return null;
  return provider.getContent();
};

// Attach TMDB metadata to the content record when available.
export const enrichContentWithTmdb = async (content) => {
  if (!content) return null;
  if (!isTmdbConfigured) {
    return { ...content, tmdb: null };
  }

  try {
    const metadata = await getTmdbMetadata(content);
    if (!metadata) return { ...content, tmdb: null };
    return { ...content, tmdb: metadata };
  } catch (error) {
    return { ...content, tmdb: null };
  }
};
