// Configuration for the TMDB API.
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';

export const isTmdbConfigured = Boolean(TMDB_API_KEY);

// Cache in-flight + resolved lookups by provider + normalized title.
const cache = new Map();

// Normalize strings for comparison and cache keys.
const normalize = (value) =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Fetch helper that applies API key, language, and params.
const fetchTmdb = async (path, params = {}) => {
  if (!TMDB_API_KEY) throw new Error('TMDB is not configured.');

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'en-US');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }
  return response.json();
};

// Choose the most likely match from TMDB search results.
const pickBestMatch = (results, query) => {
  if (!results || results.length === 0) return null;
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return results[0];

  const exact = results.find((result) =>
    normalize(result.title || result.name) === normalizedQuery
  );
  if (exact) return exact;

  return results[0];
};

// Convert TMDB details into the metadata shape used by the app.
const formatMetadata = (details, match, query) => {
  if (!details || !match) return null;
  const releaseDate = details.release_date || details.first_air_date || '';
  const year = releaseDate ? releaseDate.slice(0, 4) : '';
  const title = details.title || details.name || match.title || match.name || query;

  return {
    id: details.id,
    mediaType: match.media_type,
    title,
    originalTitle: details.original_title || details.original_name,
    genres: Array.isArray(details.genres) ? details.genres.map((g) => g.name) : [],
    releaseDate,
    year,
    rating: typeof details.vote_average === 'number' ? details.vote_average : null,
    voteCount: typeof details.vote_count === 'number' ? details.vote_count : null,
    overview: details.overview,
    posterPath: details.poster_path
      ? `${TMDB_IMAGE_BASE_URL}${details.poster_path}`
      : null,
    tmdbUrl: match.media_type
      ? `https://www.themoviedb.org/${match.media_type}/${details.id}`
      : null,
    matchMethod: 'title'
  };
};

// Public entry point: look up TMDB metadata for a content record.
export const getTmdbMetadata = async (content) => {
  const query = content?.title;
  if (!query) return null;

  // Cache by provider id + normalized title to avoid repeat calls.
  const cacheKey = `${content.provider}:${content.providerId}:${normalize(query)}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const lookupPromise = (async () => {
    const search = await fetchTmdb('/search/multi', {
      query,
      include_adult: 'false'
    });

    const match = pickBestMatch(search?.results || [], query);
    if (!match || !match.media_type || !match.id) return null;

    const details = await fetchTmdb(`/${match.media_type}/${match.id}`, {
      append_to_response: 'images'
    });

    return formatMetadata(details, match, query);
  })().catch((error) => {
    // Remove failed lookups so a later attempt can retry.
    cache.delete(cacheKey);
    throw error;
  });

  cache.set(cacheKey, lookupPromise);
  return lookupPromise;
};
