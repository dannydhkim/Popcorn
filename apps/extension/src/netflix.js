// Netflix uses numeric ids in both title and watch URLs.
const TITLE_ID_REGEX = /\/title\/(\d+)/;
const WATCH_ID_REGEX = /\/watch\/(\d+)/;
const JBV_ID_REGEX = /[?#&]jbv=(\d+)/;

// Known Netflix hostnames to scope injection.
const NETFLIX_HOSTS = new Set(['netflix.com', 'www.netflix.com']);
// Fallback when the DOM does not return a title.
const DEFAULT_TITLE = 'Netflix title';
const YEAR_REGEX = /\b(19|20)\d{2}\b/;
const DEBUG = true;
const STABLE_CACHE = new Map();
const PREVIEW_FIELDS_CACHE = new Map();
const PAGE_FIELDS_CACHE = new Map();
const TITLE_PAGE_FIELDS_CACHE = new Map();
const PREVIEW_YEAR_SELECTORS = [
  '[data-uia="previewModal--year"]',
  '[data-uia="previewModal--metadatum-release-year"]',
  '[data-uia="previewModal--details-year"]'
];
const PAGE_YEAR_SELECTORS = [
  '[data-uia="item-year"]',
  '[data-uia="title-info-metadata-item"]',
  '[data-uia="title-info-metadata"] span'
];
const PAGE_YEAR_META_SELECTORS = [
  'meta[itemprop="datePublished"]',
  'meta[property="og:release_date"]',
  'meta[name="release_year"]'
];
const TITLE_PAGE_ROOT_SELECTORS = [
  '[data-uia="title-page"]',
  '[data-uia="title-info"]',
  '.title-info'
];
const TITLE_PAGE_METADATA_SELECTORS = [
  '[data-uia="title-info-metadata"]',
  '.title-info-metadata'
];
const TITLE_PAGE_TITLE_SELECTORS = [
  '[data-uia="title-info-title"]',
  '[data-uia="hero-title"]',
  'h1[data-uia*="title"]',
  'h1'
];
const TITLE_PAGE_DURATION_SELECTORS = [
  '[data-uia="item-runtime"]',
  '[data-uia="item-duration"]',
  '[data-uia*="runtime"]',
  '.duration'
];
const TITLE_PAGE_GENRE_SELECTORS = [
  '[data-uia="item-genre"] a',
  '[data-uia="item-genre"] span',
  '[data-uia="item-genre"]',
  'a[href*="/genre/"]'
];
const PLAYER_CONTAINER_SELECTORS = [
  '[data-uia="player"]',
  '[data-uia="watch-video"]',
  '.watch-video',
  '.watch-video--player-view',
  '[data-uia="video-canvas"]'
];
const PLAYER_OVERLAY_SELECTORS = [
  '.watch-video--evidence-overlay-container',
  '[data-uia="evidence-overlay"]',
  '[data-uia="player-controls"]',
  '[data-uia="player-controls-container"]'
];
const PLAYER_TITLE_SELECTORS = [
  '[data-uia="video-title"]',
  '[data-uia="player-title"]',
  '[data-uia="player-title-text"]',
  '[data-uia="player-info-title"]',
  '[data-uia="evidence-title"]',
  '.watch-video--title',
  '.video-title'
];
const PLAYER_CONTAINER_SELECTOR = PLAYER_CONTAINER_SELECTORS.join(', ');
const PLAYER_OVERLAY_SELECTOR = PLAYER_OVERLAY_SELECTORS.join(', ');
const HOVER_STALE_MS = 3500;
const HOVER_LINK_SELECTOR =
  'a[href*="/title/"], a[href*="/watch/"], a[href*="jbv="]';
const BILLBOARD_TITLE_SELECTOR = '[data-uia="billboard-title"]';
const HOVER_CONTAINER_SELECTOR = [
  HOVER_LINK_SELECTOR,
  '[data-video-id]',
  '[data-videoid]',
  '[data-uia^="title-card"]',
  '[data-uia*="title-card"]',
  '.title-card-container',
  '.slider-item',
  '.billboard-row',
  '.billboard',
  '[data-uia*="billboard"]',
  '.hero-card',
  '.billboard-pane'
].join(', ');
const HOVER_TITLE_SELECTORS = [
  '[data-uia="title-card-title"]',
  '[data-uia="billboard-title"]',
  '.billboard-title',
  '.title-card-title',
  '.previewModal--section-header strong',
  '#previewModal--section-header strong',
  'h1',
  'h2',
  'h3'
];
const ACTION_LABELS = new Set([
  'play',
  'more info',
  'my list',
  'add to my list',
  'resume',
  'watch now',
  'watch',
  'trailer'
]);

const debugLog = (...args) => {
  if (!DEBUG) return;
  console.log('[popcorn][netflix]', ...args);
};

const normalize = (value) =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const stripNetflixSuffix = (value) =>
  (value ? String(value).trim() : '').replace(/\s*[-|]\s*Netflix\s*$/i, '').trim();

const isGenericTitle = (value) => {
  const normalized = normalize(stripNetflixSuffix(value));
  return (
    !normalized ||
    normalized === 'netflix' ||
    normalized === 'netflix home' ||
    normalized === 'home' ||
    normalized === 'browse'
  );
};

// Normalize DOM text into a safe string.
const safeText = (value) => (value ? value.trim() : '');

const cleanHoverTitle = (value) => {
  const cleaned = stripNetflixSuffix(safeText(value));
  if (!cleaned) return '';
  if (isGenericTitle(cleaned)) return '';
  const normalized = normalize(cleaned);
  if (!normalized || ACTION_LABELS.has(normalized)) return '';
  return cleaned;
};

const extractYearFromText = (value) => {
  const match = safeText(value).match(YEAR_REGEX);
  return match ? match[0] : '';
};

const parseDurationMinutes = (value) => {
  const text = safeText(value).toLowerCase();
  if (!text) return null;
  const hourMatch = text.match(/(\d+)\s*h/);
  const minuteMatch = text.match(/(\d+)\s*m/);
  if (!hourMatch && !minuteMatch) return null;
  const hours = hourMatch ? Number.parseInt(hourMatch[1], 10) : 0;
  const minutes = minuteMatch ? Number.parseInt(minuteMatch[1], 10) : 0;
  return hours * 60 + minutes;
};

const pickYearFromNodes = (nodes) => {
  for (const node of nodes) {
    const year = extractYearFromText(node?.textContent);
    if (year) return year;
  }
  return '';
};

const looksLikeCombinedTitle = (candidate, previous) => {
  if (!candidate || !previous) return false;
  const normalizedCandidate = normalize(candidate);
  const normalizedPrevious = normalize(previous);
  if (!normalizedCandidate || !normalizedPrevious) return false;
  if (!normalizedCandidate.includes(normalizedPrevious)) return false;
  if (candidate.length <= previous.length + 2) return false;
  return candidate.includes(':') || candidate.includes(' - ') || candidate.includes(' | ');
};

const stabilizeContent = (content) => {
  if (!content?.platformItemId) return content;
  const key = content.platformItemId;
  const previous = STABLE_CACHE.get(key);
  const yearKey = Object.prototype.hasOwnProperty.call(content, 'yearPublished')
    ? 'yearPublished'
    : 'year';

  if (!previous) {
    if (content.title || content[yearKey]) {
      STABLE_CACHE.set(key, {
        title: content.title || '',
        year: content[yearKey] || '',
        url: content.url || ''
      });
    }
    return content;
  }

  const urlSame = Boolean(previous.url && content.url && previous.url === content.url);
  const nextTitle = content.title || '';
  const prevTitle = previous.title || '';
  const nextYear = content[yearKey] || '';
  const prevYear = previous.year || '';

  const keepTitle =
    urlSame && (nextTitle === '' || looksLikeCombinedTitle(nextTitle, prevTitle));
  const resolvedTitle = keepTitle ? prevTitle : nextTitle;
  const resolvedYear = nextYear || (urlSame ? prevYear : nextYear);

  if (keepTitle || (!nextTitle && prevTitle)) {
    debugLog('stabilize title', {
      id: key,
      prevTitle,
      nextTitle,
      resolvedTitle
    });
  }

  STABLE_CACHE.set(key, {
    title: resolvedTitle || prevTitle,
    year: resolvedYear || prevYear,
    url: content.url || previous.url
  });

  return {
    ...content,
    title: resolvedTitle || '',
    [yearKey]: resolvedYear || ''
  };
};

// Convert a string into a URL, or null if it is invalid.
const resolveUrl = (href) => {
  if (!href) return null;
  try {
    return new URL(href, window.location.origin);
  } catch (error) {
    return null;
  }
};

// Parse a Netflix URL or path into a Netflix id and type.
const extractIdFromPath = (href) => {
  if (!href) return null;
  const resolved = resolveUrl(href);
  const urlString = resolved?.toString() || href;
  const jbvParam = resolved?.searchParams?.get('jbv');
  if (jbvParam) return { id: jbvParam, type: 'title' };
  const jbvMatch = urlString.match(JBV_ID_REGEX);
  if (jbvMatch) return { id: jbvMatch[1], type: 'title' };

  const path = resolved?.pathname || href;
  const titleMatch = path.match(TITLE_ID_REGEX);
  if (titleMatch) return { id: titleMatch[1], type: 'title' };
  const watchMatch = path.match(WATCH_ID_REGEX);
  if (watchMatch) return { id: watchMatch[1], type: 'watch' };
  return null;
};

// Use OG metadata when present to avoid URL inconsistencies.
const urlFromMeta = () => {
  const ogUrl = document.querySelector('meta[property="og:url"]');
  return ogUrl?.content || window.location.href;
};

// Derive the platform identifier from a URL.
const derivePlatformFromUrl = (href) => {
  const resolved = resolveUrl(href);
  if (!resolved) return null;
  const hostname = resolved.hostname.replace(/^www\./, '').toLowerCase();
  if (hostname.endsWith('netflix.com')) return 'netflix';
  return hostname;
};

const buildNetflixUrl = (info) => {
  if (!info?.id) return '';
  const path = info.type === 'watch' ? 'watch' : 'title';
  return `https://www.netflix.com/${path}/${info.id}`;
};

let hoverCandidate = null;
let hoverCandidateAt = 0;
let hoverTrackingEnabled = false;

const titleFromHover = (container) => {
  if (!container) return '';
  const directLabel = cleanHoverTitle(container.getAttribute?.('aria-label'));
  if (directLabel) return directLabel;

  for (const selector of HOVER_TITLE_SELECTORS) {
    const node = container.querySelector(selector);
    if (!node) continue;
    let text = '';
    if (node.tagName === 'IMG') {
      text =
        node.getAttribute('title') ||
        node.getAttribute('alt') ||
        node.textContent;
    } else {
      text =
        node.querySelector('img[title]')?.getAttribute('title') ||
        node.querySelector('img[alt]')?.getAttribute('alt') ||
        node.textContent;
    }
    const candidate = cleanHoverTitle(text);
    if (candidate) return candidate;
  }

  const titleText = cleanHoverTitle(
    container.querySelector('img[title]')?.getAttribute('title')
  );
  if (titleText) return titleText;

  const altText = cleanHoverTitle(
    container.querySelector('img[alt]')?.getAttribute('alt')
  );
  if (altText) return altText;

  return '';
};

const yearFromHover = (container) => {
  if (!container) return '';
  const yearNode =
    container.querySelector('.year') ||
    container.querySelector('[data-uia="title-card-year"]');
  const yearText = extractYearFromText(yearNode?.textContent);
  if (yearText) return yearText;
  return extractYearFromText(container.textContent);
};

const extractVideoIdFromTracking = (value) => {
  if (!value) return '';
  const raw = String(value);
  const match = raw.match(/"video_id"\s*:\s*"?(\d+)"?/i);
  if (match) return match[1];
  const encodedMatch = raw.match(/video_id%22%3A%22(\d+)/i);
  return encodedMatch ? encodedMatch[1] : '';
};

const getVideoIdFromElement = (element) => {
  if (!element) return '';
  const direct =
    element.getAttribute?.('data-video-id') ||
    element.getAttribute?.('data-videoid');
  if (direct) return direct;

  const tracking = extractVideoIdFromTracking(
    element.getAttribute?.('data-ui-tracking-context')
  );
  if (tracking) return tracking;

  const child = element.querySelector?.('[data-video-id], [data-videoid]');
  if (!child) return '';
  return child.getAttribute('data-video-id') || child.getAttribute('data-videoid') || '';
};

const getCandidateFromContainer = (container) => {
  if (!container) return null;
  const link = container.matches?.(HOVER_LINK_SELECTOR)
    ? container
    : container.querySelector?.(HOVER_LINK_SELECTOR);
  const href = link?.getAttribute?.('href') || '';
  const linkInfo = extractIdFromPath(href);
  const videoId = getVideoIdFromElement(container);
  const info = linkInfo || (videoId ? { id: videoId, type: 'title' } : null);
  if (!info?.id) return null;

  const resolvedUrl = resolveUrl(href)?.toString() || buildNetflixUrl(info);
  const title = titleFromHover(container) || titleFromHover(link);
  const year = yearFromHover(container);

  return {
    info,
    url: resolvedUrl,
    title,
    year
  };
};

const getHoverCandidateFromTarget = (target) => {
  if (!target?.closest) return null;
  let container = target.closest(HOVER_CONTAINER_SELECTOR);
  while (container) {
    const candidate = getCandidateFromContainer(container);
    if (candidate?.info?.id) return candidate;
    container = container.parentElement?.closest(HOVER_CONTAINER_SELECTOR) || null;
  }
  return null;
};

const updateHoverCandidate = (event) => {
  const nextCandidate = getHoverCandidateFromTarget(event.target);
  if (!nextCandidate?.info?.id) return;
  hoverCandidate = nextCandidate;
  hoverCandidateAt = Date.now();
};

const ensureHoverTracking = () => {
  if (hoverTrackingEnabled || !isNetflixHost()) return;
  document.addEventListener('pointerover', updateHoverCandidate, true);
  document.addEventListener('focusin', updateHoverCandidate, true);
  hoverTrackingEnabled = true;
};

const getHoverCandidate = () => {
  if (hoverCandidate && Date.now() - hoverCandidateAt <= HOVER_STALE_MS) {
    return hoverCandidate;
  }

  const hoveredElements = document.querySelectorAll(':hover');
  const target = hoveredElements[hoveredElements.length - 1];
  const refreshed = getHoverCandidateFromTarget(target);
  if (refreshed?.info?.id) {
    hoverCandidate = refreshed;
    hoverCandidateAt = Date.now();
    return refreshed;
  }

  return null;
};

const captureCandidate = (candidate, source = 'preview') => {
  if (!candidate?.info?.id) return null;

  const cachedFields = PREVIEW_FIELDS_CACHE.get(candidate.info.id)?.fields;
  const stableEntry = STABLE_CACHE.get(candidate.info.id) || {};
  const title =
    candidate.title || cachedFields?.title || stableEntry.title || '';
  const year =
    candidate.year || cachedFields?.year || stableEntry.year || '';
  const durationMinutes = cachedFields?.durationMinutes ?? null;
  const genres = cachedFields?.genres || [];
  const url = candidate.url || buildNetflixUrl(candidate.info);

  return stabilizeContent({
    title,
    yearPublished: year,
    durationMinutes,
    genres,
    url,
    platform: derivePlatformFromUrl(url),
    platformItemId: candidate.info.id,
    source,
    type: candidate.info.type
  });
};

const captureHover = () => captureCandidate(getHoverCandidate(), 'preview');

const getBillboardCandidate = () => {
  const billboardTitle = document.querySelector(BILLBOARD_TITLE_SELECTOR);
  if (!billboardTitle) return null;
  return getHoverCandidateFromTarget(billboardTitle);
};

const captureBillboard = () => captureCandidate(getBillboardCandidate(), 'preview');

const isPreviewUrl = (href = window.location.href) =>
  Boolean(href && (href.includes('/title/') || JBV_ID_REGEX.test(href)));

const isPlayerUrl = (href = window.location.href) =>
  Boolean(href && href.includes('/watch/'));

const getPreviewContext = (previewNode) => {
  if (!previewNode) return null;
  const previewIdNode = previewNode.querySelector('[data-video-id]');
  const previewVideoId = previewIdNode?.getAttribute('data-video-id');
  const previewLink = previewNode.querySelector('a[href*="/title/"], a[href*="jbv="]');
  const previewHref = previewLink?.getAttribute('href');
  const previewUrl = resolveUrl(previewHref);
  const previewInfo =
    extractIdFromPath(previewHref) ||
    (previewVideoId ? { id: previewVideoId, type: 'title' } : null) ||
    extractIdFromPath(window.location.href);
  if (!previewInfo?.id) return null;

  const url = previewUrl?.toString() || buildNetflixUrl(previewInfo);
  return { previewInfo, previewHref, previewUrl, url };
};

const getPageContextFromMeta = () => {
  const url = urlFromMeta();
  const resolvedUrl = resolveUrl(url);
  const locationInfo = extractIdFromPath(resolvedUrl?.toString() || url || window.location.href);
  if (!locationInfo?.id) return null;
  const urlString = resolvedUrl?.toString() || window.location.href;
  return { locationInfo, urlString };
};

// Extract title text from the preview modal container.
const titleFromPreview = (previewNode) => {
  if (!previewNode) return '';
  const aboutTitleNode =
    previewNode.querySelector('.previewModal--section-header strong') ||
    previewNode.querySelector('#previewModal--section-header strong');
  const Title = safeText(aboutTitleNode?.textContent);
  if (Title) {
    return Title;
  }
};

// Extract year text from the preview modal container.
const yearFromPreview = (previewNode) => {
  if (!previewNode) return '';
  const videoMetadataYear = extractYearFromText(
    previewNode.querySelector('.videoMetadata--line .year')?.textContent
  );
  if (videoMetadataYear) {
    return videoMetadataYear;
  }

  const primaryYear = pickYearFromNodes(
    PREVIEW_YEAR_SELECTORS.map((selector) => previewNode.querySelector(selector))
  );
  if (primaryYear) {
    debugLog('preview year (primary)', { year: primaryYear });
    return primaryYear;
  }

  const metadataNodes = previewNode.querySelectorAll(
    '[data-uia="previewModal--metadatum"], [data-uia="previewModal--details"] span'
  );
  for (const node of metadataNodes) {
    const year = extractYearFromText(node?.textContent);
    if (year) {
      debugLog('preview year (metadata)', { year });
      return year;
    }
  }

  const fallbackYear = extractYearFromText(previewNode.textContent);
  debugLog('preview year (fallback)', { year: fallbackYear });
  return fallbackYear;
};

const durationFromPreview = (previewNode) => {
  if (!previewNode) return null;
  const durationText =
    previewNode.querySelector('.videoMetadata--line .duration')?.textContent || '';
  const minutes = parseDurationMinutes(durationText);
  if (minutes !== null) {
  }
  return minutes;
};

const castFromPreview = (previewNode) => {
  if (!previewNode) return [];
  const labelNode = previewNode.querySelector('[data-uia="previewModal--tags-person"]');
  if (!labelNode) return [];

  const collected = [];
  let cursor = labelNode.nextSibling;
  while (cursor) {
    if (
      cursor.nodeType === Node.ELEMENT_NODE &&
      cursor.classList?.contains('previewModal--tags-label')
    ) {
      break;
    }
    collected.push(cursor.textContent || '');
    cursor = cursor.nextSibling;
  }

  let raw = safeText(collected.join(' '));
  if (!raw) {
    const containerText = safeText(labelNode.parentElement?.textContent);
    const labelText = safeText(labelNode.textContent);
    raw = safeText(containerText.replace(labelText, ''));
  }

  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const genresFromPreview = (previewNode) => {
  if (!previewNode) return [];
  const labelNode = previewNode.querySelector('[data-uia="previewModal--tags-genre"]');
  if (!labelNode) return [];

  const collected = [];
  let cursor = labelNode.nextSibling;
  while (cursor) {
    if (
      cursor.nodeType === Node.ELEMENT_NODE &&
      cursor.classList?.contains('previewModal--tags-label')
    ) {
      break;
    }
    collected.push(cursor.textContent || '');
    cursor = cursor.nextSibling;
  }

  let raw = safeText(collected.join(' '));
  if (!raw) {
    const containerText = safeText(labelNode.parentElement?.textContent);
    const labelText = safeText(labelNode.textContent);
    raw = safeText(containerText.replace(labelText, ''));
  }

  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const getTitlePageRoot = () => {
  for (const selector of TITLE_PAGE_ROOT_SELECTORS) {
    const node = document.querySelector(selector);
    if (node) return node;
  }
  return document.body;
};

const getTitlePageMetadataRoot = (root = getTitlePageRoot()) => {
  for (const selector of TITLE_PAGE_METADATA_SELECTORS) {
    const node = root?.querySelector(selector) || document.querySelector(selector);
    if (node) return node;
  }
  return null;
};

const titleFromTitlePage = () => {
  const root = getTitlePageRoot();
  for (const selector of TITLE_PAGE_TITLE_SELECTORS) {
    const node = root?.querySelector(selector) || document.querySelector(selector);
    const candidate = cleanHoverTitle(node?.textContent);
    if (candidate) return candidate;
  }

  const fallbackTitle = cleanHoverTitle(document.title);
  return fallbackTitle || '';
};

const durationFromTitlePage = () => {
  const metadataRoot = getTitlePageMetadataRoot();
  const durationNode = metadataRoot?.querySelector(TITLE_PAGE_DURATION_SELECTORS.join(', '));
  const durationText = durationNode?.textContent || metadataRoot?.textContent || '';
  return parseDurationMinutes(durationText);
};

const genresFromTitlePage = () => {
  const metadataRoot = getTitlePageMetadataRoot();
  if (!metadataRoot) return [];

  const nodes = metadataRoot.querySelectorAll(TITLE_PAGE_GENRE_SELECTORS.join(', '));
  const genres = [];
  const seen = new Set();
  for (const node of nodes) {
    const text = safeText(node?.textContent);
    if (!text) continue;
    if (extractYearFromText(text)) continue;
    if (parseDurationMinutes(text) !== null) continue;
    const key = normalize(text);
    if (!key) continue;
    if (key.includes('season') || key.includes('episode')) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    genres.push(text);
  }

  return genres;
};

const titleFromPlayerContainer = (container) => {
  if (!container) return '';
  const directLabel = cleanHoverTitle(container.getAttribute?.('aria-label'));
  if (directLabel) return directLabel;

  for (const selector of PLAYER_TITLE_SELECTORS) {
    const node = container.querySelector(selector);
    if (!node) continue;
    const text = node.tagName === 'IMG' ? node.getAttribute('alt') : node.textContent;
    const candidate = cleanHoverTitle(text);
    if (candidate) return candidate;
  }

  const titleNode = container.querySelector('[data-uia*="title"]');
  const titleText = cleanHoverTitle(titleNode?.textContent);
  if (titleText) return titleText;

  const headingNode = container.querySelector('h1, h2, h3, strong');
  const headingText = cleanHoverTitle(headingNode?.textContent);
  if (headingText) return headingText;

  return '';
};

// Extract title text from the player UI/overlay once it's available.
const titleFromPage = () => {
  const containers = [];
  const playerContainer = document.querySelector(PLAYER_CONTAINER_SELECTOR);
  if (playerContainer) containers.push(playerContainer);
  const overlayContainer = document.querySelector(PLAYER_OVERLAY_SELECTOR);
  if (overlayContainer && overlayContainer !== playerContainer) {
    containers.push(overlayContainer);
  }

  for (const container of containers) {
    const title = titleFromPlayerContainer(container);
    if (title) {
      debugLog('player title', { title });
      return title;
    }
  }

  return '';
};

// Extract year text from the main title page.
const yearFromPage = () => {
  const primaryYear = pickYearFromNodes(
    PAGE_YEAR_SELECTORS.map((selector) => document.querySelector(selector))
  );
  if (primaryYear) {
    debugLog('page year (primary)', { year: primaryYear });
    return primaryYear;
  }

  const metadataNodes = document.querySelectorAll(
    '[data-uia="title-info-metadata-item"]'
  );
  for (const node of metadataNodes) {
    const year = extractYearFromText(node?.textContent);
    if (year) {
      debugLog('page year (metadata)', { year });
      return year;
    }
  }

  const metaCandidates = PAGE_YEAR_META_SELECTORS.map((selector) =>
    document.querySelector(selector)
  );
  for (const meta of metaCandidates) {
    const year = extractYearFromText(meta?.content);
    if (year) {
      debugLog('page year (meta)', { year });
      return year;
    }
  }

  const fallbackYear = extractYearFromText(document.title);
  debugLog('page year (fallback)', { year: fallbackYear });
  return fallbackYear;
};

const getPreviewFields = (previewNode, previewId) => {
  const cached = PREVIEW_FIELDS_CACHE.get(previewId);
  if (cached?.complete) {
    return { ...cached, fromCache: true };
  }

  const title = titleFromPreview(previewNode);
  const year = yearFromPreview(previewNode);
  const durationMinutes = durationFromPreview(previewNode);
  const genres = genresFromPreview(previewNode);
  const titleIsGeneric = isGenericTitle(title);

  const hasYearNode =
    Boolean(previewNode.querySelector('.videoMetadata--line .year')) ||
    PREVIEW_YEAR_SELECTORS.some((selector) => previewNode.querySelector(selector));
  const hasDurationNode = Boolean(
    previewNode.querySelector('.videoMetadata--line .duration')
  );
  const hasGenresNode = Boolean(
    previewNode.querySelector('[data-uia="previewModal--tags-genre"]')
  );

  // If title looks generic but we have metadata, it's likely a real show
  const hasMetadata = Boolean(year || durationMinutes || genres.length);
  const isActuallyGeneric = titleIsGeneric && !hasMetadata;

  const complete =
    Boolean(title) &&
    !isActuallyGeneric &&
    (year || !hasYearNode) &&
    (durationMinutes !== null || !hasDurationNode) &&
    (genres.length || !hasGenresNode);

  const fields = {
    title,
    year,
    durationMinutes,
    genres
  };
  const entry = { fields, complete };
  PREVIEW_FIELDS_CACHE.set(previewId, entry);
  return { ...entry, fromCache: false };
};

const getPageFields = (pageId) => {
  const cached = PAGE_FIELDS_CACHE.get(pageId);
  if (cached?.complete) {
    return { ...cached, fromCache: true };
  }

  const title = titleFromPage();
  const year = yearFromPage();
  const titleIsGeneric = isGenericTitle(title);

  // If title looks generic but we have a year, it's likely a real show
  const hasMetadata = Boolean(year);
  const isActuallyGeneric = titleIsGeneric && !hasMetadata;

  const complete = Boolean(title) && !isActuallyGeneric;
  const entry = {
    fields: {
      title,
      year
    },
    complete
  };

  PAGE_FIELDS_CACHE.set(pageId, entry);
  return { ...entry, fromCache: false };
};

const getTitlePageFields = (pageId) => {
  const cached = TITLE_PAGE_FIELDS_CACHE.get(pageId);
  if (cached?.complete) {
    return { ...cached, fromCache: true };
  }

  const title = titleFromTitlePage();
  const year = yearFromPage();
  const durationMinutes = durationFromTitlePage();
  const genres = genresFromTitlePage();
  const titleIsGeneric = isGenericTitle(title);

  const metadataRoot = getTitlePageMetadataRoot();
  const hasYearNode = Boolean(metadataRoot?.querySelector('[data-uia="item-year"]'));
  const hasDurationNode = Boolean(
    metadataRoot?.querySelector(TITLE_PAGE_DURATION_SELECTORS.join(', '))
  );
  const hasGenresNode = Boolean(
    metadataRoot?.querySelector(TITLE_PAGE_GENRE_SELECTORS.join(', '))
  );

  // If title looks generic but we have metadata (year/duration/genres), it's likely a real show
  // e.g., DreamWorks "Home" movie will have year/duration/genres
  const hasMetadata = Boolean(year || durationMinutes || genres.length);
  const isActuallyGeneric = titleIsGeneric && !hasMetadata;

  const complete =
    Boolean(title) &&
    !isActuallyGeneric &&
    (year || !hasYearNode) &&
    (durationMinutes !== null || !hasDurationNode) &&
    (genres.length || !hasGenresNode);

  const entry = {
    fields: {
      title,
      year,
      durationMinutes,
      genres
    },
    complete
  };

  TITLE_PAGE_FIELDS_CACHE.set(pageId, entry);
  return { ...entry, fromCache: false };
};

const logCaptureOnce = (label, payload, fromCache) => {
  if (fromCache) return;
  debugLog(label, payload);
};

// Check if the current hostname matches Netflix.
export const isNetflixHost = (hostname = window.location.hostname) =>
  NETFLIX_HOSTS.has(hostname);

// Clear Netflix DOM caches when navigating to ensure fresh captures
export const clearNetflixCaches = () => {
  PREVIEW_FIELDS_CACHE.clear();
  PAGE_FIELDS_CACHE.clear();
  TITLE_PAGE_FIELDS_CACHE.clear();
  debugLog('Cleared Netflix DOM caches');
};

// Capture Netflix DOM metadata for content_urls ingestion.
export const getNetflixContent = () => {
  const href = window.location.href;
  ensureHoverTracking();

  const capturePreview = () => {
    const preview = document.querySelector('div.detail-modal-container');
    const previewContext = getPreviewContext(preview);
    if (!previewContext?.previewInfo?.id) return null;

    const { fields, complete } = getPreviewFields(preview, previewContext.previewInfo.id);
    if (!complete) return null;
    const capture = stabilizeContent({
      title: fields.title,
      yearPublished: fields.year,
      durationMinutes: fields.durationMinutes,
      genres: fields.genres,
      url: previewContext.url,
      platform: derivePlatformFromUrl(previewContext.url),
      platformItemId: previewContext.previewInfo.id,
      source: 'preview',
      type: previewContext.previewInfo.type
    });
    return capture;
  };

  const captureTitlePage = () => {
    const pageContext = getPageContextFromMeta();
    const locationInfo = pageContext?.locationInfo || extractIdFromPath(href);
    const urlString = pageContext?.urlString || href;
    if (!locationInfo?.id) return null;

    const { fields, complete, fromCache } = getTitlePageFields(locationInfo.id);
    if (!complete) return null;
    const capture = stabilizeContent({
      title: fields.title,
      yearPublished: fields.year,
      durationMinutes: fields.durationMinutes,
      genres: fields.genres,
      url: urlString,
      platform: derivePlatformFromUrl(urlString),
      platformItemId: locationInfo.id,
      source: 'preview',
      type: locationInfo.type
    });
    logCaptureOnce('dom capture title page data', capture, fromCache);
    return capture;
  };

  if (isPlayerUrl(href)) {
    const pageContext = getPageContextFromMeta();
    const locationInfo = pageContext?.locationInfo || extractIdFromPath(href);
    const urlString = pageContext?.urlString || href;
    if (!locationInfo?.id) return null;

    const { fields, complete, fromCache } = getPageFields(locationInfo.id);
    if (!complete) return null;
    const capture = stabilizeContent({
      title: fields.title,
      yearPublished: fields.year,
      url: urlString,
      platform: derivePlatformFromUrl(urlString),
      platformItemId: locationInfo.id,
      source: 'player',
      type: locationInfo.type
    });
    logCaptureOnce('dom capture player data', capture, fromCache);
    return capture;
  }

  const previewCapture = capturePreview();
  if (isPreviewUrl(href)) {
    if (previewCapture) return previewCapture;
    return captureTitlePage();
  }

  if (previewCapture) return previewCapture;

  const hoverCapture = captureHover();
  if (hoverCapture) return hoverCapture;

  const billboardCapture = captureBillboard();
  if (billboardCapture) return billboardCapture;

  return previewCapture;
};
