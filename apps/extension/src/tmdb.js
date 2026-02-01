// Configuration for the TMDB API.
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'd9fa5c9d7cd178d5f9f0da87bfa200f1';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';

export const isTmdbConfigured = Boolean(TMDB_API_KEY);

const DEBUG = true;
const debugLog = (...args) => {
  if (!DEBUG) return;
  console.log('[popcorn][tmdb]', ...args);
};

// Cache in-flight + resolved lookups by provider + normalized title.
const cache = new Map();
const MAX_CANDIDATES = 8;

// Normalize strings for comparison and cache keys.
const normalize = (value) =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tokenize = (value) => normalize(value).split(' ').filter(Boolean);

const parseYearValue = (value) => {
  if (!value) return null;
  const yearNumber = Number.parseInt(String(value).slice(0, 4), 10);
  return Number.isNaN(yearNumber) ? null : yearNumber;
};

const resultYear = (result) => {
  const date = result?.release_date || result?.first_air_date || '';
  return date ? date.slice(0, 4) : '';
};

const getResultTitle = (details, match) =>
  details?.title || details?.name || match?.title || match?.name || '';

const getResultYear = (details, match) =>
  parseYearValue(details?.release_date || details?.first_air_date || resultYear(match));

const getResultDurationMinutes = (details) => {
  if (typeof details?.runtime === 'number') return details.runtime;
  if (Array.isArray(details?.episode_run_time) && details.episode_run_time.length) {
    const sum = details.episode_run_time.reduce((total, minutes) => total + minutes, 0);
    return Math.round(sum / details.episode_run_time.length);
  }
  return null;
};

const getResultGenres = (details) =>
  Array.isArray(details?.genres) ? details.genres.map((genre) => genre.name).filter(Boolean) : [];

const scoreTitle = (query, candidate) => {
  const normalizedQuery = normalize(query);
  const normalizedCandidate = normalize(candidate);
  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedQuery === normalizedCandidate) return 1;
  if (
    normalizedCandidate.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedCandidate)
  ) {
    return 0.9;
  }
  const queryTokens = new Set(tokenize(normalizedQuery));
  const candidateTokens = new Set(tokenize(normalizedCandidate));
  if (!queryTokens.size || !candidateTokens.size) return 0;
  let intersection = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) intersection += 1;
  }
  const union = queryTokens.size + candidateTokens.size - intersection;
  return union ? intersection / union : 0;
};

const scoreYear = (targetYear, candidateYear) => {
  if (!targetYear || !candidateYear) return null;
  const diff = Math.abs(targetYear - candidateYear);
  if (diff > 1) return 0;
  return diff === 0 ? 1 : 0.6;
};

const scoreDuration = (targetMinutes, candidateMinutes) => {
  if (!targetMinutes || !candidateMinutes) return null;
  const diff = Math.abs(targetMinutes - candidateMinutes);
  return diff <= 10 ? 1 : 0;
};

const scoreGenres = (targetGenres, candidateGenres) => {
  if (!targetGenres?.length || !candidateGenres?.length) return null;
  const target = new Set(targetGenres.map((genre) => normalize(genre)).filter(Boolean));
  const candidate = new Set(candidateGenres.map((genre) => normalize(genre)).filter(Boolean));
  if (!target.size || !candidate.size) return null;
  let matches = 0;
  target.forEach((genre) => {
    if (candidate.has(genre)) matches += 1;
  });
  if (!matches) return 0;
  return matches / target.size;
};

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

const searchMovies = (query, year) =>
  fetchTmdb('/search/movie', {
    query,
    year,
    include_adult: 'false'
  });

const searchTv = (query, year) =>
  fetchTmdb('/search/tv', {
    query,
    first_air_date_year: year,
    include_adult: 'false'
  });

const searchMulti = (query) =>
  fetchTmdb('/search/multi', {
    query,
    include_adult: 'false'
  });

const fetchDetails = (mediaType, id) =>
  fetchTmdb(`/${mediaType}/${id}`, {
    append_to_response: 'images,external_ids,credits'
  });

const dedupeResults = (results) => {
  const seen = new Set();
  return results.filter((result) => {
    if (!result?.id) return false;
    const mediaType = result.media_type || (result.title ? 'movie' : 'tv');
    if (mediaType !== 'movie' && mediaType !== 'tv') return false;
    const key = `${mediaType}:${result.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (!result.media_type) {
      result.media_type = mediaType;
    }
    return true;
  });
};

// Choose the most likely match from TMDB search results.
const pickBestMatch = async (results, context) => {
  if (!results || results.length === 0) return null;

  const candidates = results
    .filter((result) => result?.media_type === 'movie' || result?.media_type === 'tv')
    .slice(0, MAX_CANDIDATES);

  if (!candidates.length) return null;

  const detailedCandidates = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        const details = await fetchDetails(candidate.media_type, candidate.id);
        return { match: candidate, details };
      } catch (error) {
        return null;
      }
    })
  );

  const weights = {
    title: 0.7,
    year: 0.15,
    duration: 0.1,
    genres: 0.05
  };

  let best = null;
  const scoredCandidates = [];
  for (const candidate of detailedCandidates) {
    if (!candidate?.details || !candidate?.match) continue;
    const title = getResultTitle(candidate.details, candidate.match);
    const year = getResultYear(candidate.details, candidate.match);
    const durationMinutes = getResultDurationMinutes(candidate.details);
    const genres = getResultGenres(candidate.details);

    const parts = [
      { weight: weights.title, score: scoreTitle(context.query, title) }
    ];
    const yearScore = scoreYear(context.year, year);
    if (yearScore !== null) parts.push({ weight: weights.year, score: yearScore });
    const durationScore = scoreDuration(context.durationMinutes, durationMinutes);
    if (durationScore !== null) {
      parts.push({ weight: weights.duration, score: durationScore });
    }
    const genresScore = scoreGenres(context.genres, genres);
    if (genresScore !== null) {
      parts.push({ weight: weights.genres, score: genresScore });
    }

    const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
    const score =
      totalWeight > 0
        ? parts.reduce((sum, part) => sum + part.score * part.weight, 0) / totalWeight
        : 0;

    scoredCandidates.push({
      id: candidate.match.id,
      mediaType: candidate.match.media_type,
      title,
      year,
      durationMinutes,
      genres,
      score,
      parts
    });

    if (!best || score > best.score) {
      best = {
        ...candidate,
        score
      };
    }
  }

  debugLog('candidate scores', {
    query: context.query,
    year: context.year,
    durationMinutes: context.durationMinutes,
    genres: context.genres,
    candidates: scoredCandidates,
    best: best
      ? {
        id: best.match.id,
        mediaType: best.match.media_type,
        score: best.score
      }
      : null
  });

  return best;
};

// Convert TMDB details into the metadata shape used by the app.
const formatMetadata = (details, match, query, matchMethod = 'title') => {
  if (!details || !match) return null;
  const releaseDate = details.release_date || details.first_air_date || '';
  const year = releaseDate ? releaseDate.slice(0, 4) : '';
  const title = details.title || details.name || match.title || match.name || query;
  const externalIds = details.external_ids || {};
  const credits = details.credits || {};
  const cast = Array.isArray(credits.cast)
    ? credits.cast
        .slice(0, 12)
        .map((member) => member?.name)
        .filter(Boolean)
    : [];
  const director =
    Array.isArray(credits.crew)
      ? credits.crew.find((member) => member?.job === 'Director')?.name || null
      : null;

  debugLog('format metadata', {
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
    imdbId: externalIds.imdb_id || null,
    wikidataId: externalIds.wikidata_id || null,
    externalIds,
    cast,
    matchMethod
  });

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
    imdbId: externalIds.imdb_id || null,
    wikidataId: externalIds.wikidata_id || null,
    externalIds,
    cast,
    director,
    matchMethod
  };
};

const formatCandidate = (result, details) => {
  if (!result?.id) return null;
  const title = getResultTitle(details, result);
  const yearValue = getResultYear(details, result);
  const posterPath = details?.poster_path || result?.poster_path || null;
  const mediaType = result.media_type || (result.title ? 'movie' : 'tv');
  const network =
    mediaType === 'tv'
      ? details?.networks?.[0]?.name || ''
      : '';
  const studio =
    mediaType === 'movie'
      ? details?.production_companies?.[0]?.name || ''
      : '';

  return {
    id: result.id,
    mediaType,
    title,
    year: yearValue ? String(yearValue) : '',
    posterUrl: posterPath ? `${TMDB_IMAGE_BASE_URL}${posterPath}` : '',
    network,
    studio
  };
};

export const searchTmdbCandidates = async ({ query, year, limit = 7 }) => {
  if (!query) return [];
  const parsedYear = parseYearValue(year);
  let results = [];

  if (parsedYear) {
    const [movieSearch, tvSearch, multiSearch] = await Promise.all([
      searchMovies(query, parsedYear),
      searchTv(query, parsedYear),
      searchMulti(query)
    ]);
    const orderedResults = [
      ...(movieSearch?.results || []).map((result) => ({
        ...result,
        media_type: 'movie'
      })),
      ...(tvSearch?.results || []).map((result) => ({
        ...result,
        media_type: 'tv'
      })),
      ...(multiSearch?.results || [])
    ];
    results = dedupeResults(orderedResults);
  } else {
    const multiSearch = await searchMulti(query);
    results = dedupeResults(multiSearch?.results || []);
  }

  const trimmed = results.slice(0, limit);
  if (!trimmed.length) return [];

  const detailed = await Promise.all(
    trimmed.map(async (result) => {
      try {
        const details = await fetchDetails(result.media_type, result.id);
        return formatCandidate(result, details);
      } catch (error) {
        return formatCandidate(result, null);
      }
    })
  );

  return detailed.filter(Boolean);
};

export const fetchTmdbMetadataById = async (mediaType, id) => {
  if (!mediaType || !id) return null;
  const details = await fetchDetails(mediaType, id);
  if (!details) return null;
  const title = details.title || details.name || '';
  const match = {
    id,
    media_type: mediaType,
    title
  };
  return formatMetadata(details, match, title, 'id');
};

// Public entry point: look up TMDB metadata for a content record.
export const getTmdbMetadata = async (content) => {
  const query = content?.title;
  if (!query) return null;
  const year = parseYearValue(content?.year || content?.yearPublished || '');
  const durationMinutes =
    typeof content?.durationMinutes === 'number' ? content.durationMinutes : null;
  const genres = Array.isArray(content?.genres) ? content.genres : [];

  // Cache by platform item id + normalized title to avoid repeat calls.
  const genreKey = genres.map((genre) => normalize(genre)).filter(Boolean).join('|');
  const cacheKey = `${content.provider}:${content.platformItemId}:${normalize(query)}:${year || ''}:${durationMinutes || ''}:${genreKey}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const lookupPromise = (async () => {
    let results = [];
    let matchMethod = 'fuzzy';

    if (year) {
      const [movieSearch, tvSearch, multiSearch] = await Promise.all([
        searchMovies(query, year),
        searchTv(query, year),
        searchMulti(query)
      ]);

      const orderedResults = [
        ...(movieSearch?.results || []).map((result) => ({
          ...result,
          media_type: 'movie'
        })),
        ...(tvSearch?.results || []).map((result) => ({
          ...result,
          media_type: 'tv'
        })),
        ...(multiSearch?.results || [])
      ];
      results = dedupeResults(orderedResults);
    }

    if (!results.length) {
      const search = await searchMulti(query);
      results = (search?.results || []).filter(
        (result) => result?.media_type === 'movie' || result?.media_type === 'tv'
      );
    }

    debugLog('search candidates', {
      query,
      year,
      durationMinutes,
      genres,
      resultCount: results.length,
      topResults: results.slice(0, MAX_CANDIDATES).map((result) => ({
        id: result.id,
        mediaType: result.media_type,
        title: result.title || result.name || '',
        year: resultYear(result)
      }))
    });

    const match = await pickBestMatch(results, {
      query,
      year,
      durationMinutes,
      genres
    });
    if (!match || !match.match || !match.details) return null;

    return formatMetadata(match.details, match.match, query, matchMethod);
  })().catch((error) => {
    // Remove failed lookups so a later attempt can retry.
    cache.delete(cacheKey);
    throw error;
  });

  cache.set(cacheKey, lookupPromise);
  return lookupPromise;
};
