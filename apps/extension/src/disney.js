// UUIDs are used in Disney+ URLs for titles and episodes.
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Known Disney+ hostnames to scope injection.
const DISNEY_HOSTS = new Set(['disneyplus.com', 'www.disneyplus.com']);
// Fallback title when the DOM does not provide one.
const DEFAULT_TITLE = 'Disney+ title';
const YEAR_REGEX = /\b(19|20)\d{2}\b/;

// Normalize DOM text into a safe string.
const safeText = (value) => (value ? value.trim() : '');
const extractYearFromText = (value) => {
  const match = safeText(value).match(YEAR_REGEX);
  return match ? match[0] : '';
};

// Pull the first UUID out of a URL path.
const extractIdFromPath = (path) => {
  if (!path) return null;
  const match = path.match(UUID_REGEX);
  return match ? match[0] : null;
};

// Title lookup with a few common selectors plus the document title.
const titleFromPage = () => {
  const titleNode =
    document.querySelector('[data-testid="title"]') ||
    document.querySelector('[data-testid="hero-title"]') ||
    document.querySelector('h1');

  const pageTitle = safeText(document.title.replace('| Disney+', ''));
  return safeText(titleNode?.textContent) || pageTitle;
};

// Extract year text from the main title page.
const yearFromPage = () => {
  const metaCandidates = [
    document.querySelector('meta[itemprop="datePublished"]'),
    document.querySelector('meta[property="og:release_date"]'),
    document.querySelector('meta[name="release_year"]')
  ];
  for (const meta of metaCandidates) {
    const year = extractYearFromText(meta?.content);
    if (year) return year;
  }

  return extractYearFromText(document.title);
};

// Use OG metadata when present to avoid URL inconsistencies.
const urlFromMeta = () => {
  const ogUrl = document.querySelector('meta[property="og:url"]');
  return ogUrl?.content || window.location.href;
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

// Shape the content record expected by the rest of the extension.
const buildContent = ({ platformItemId, title, url, year }) => {
  if (!platformItemId) return null;
  return {
    key: `disney:${platformItemId}`,
    provider: 'disney',
    platformItemId,
    providerType: 'uuid',
    title: title || '',
    year: year || '',
    fallbackTitle: DEFAULT_TITLE,
    url,
    source: 'page'
  };
};

// Check if the current hostname matches Disney+.
export const isDisneyHost = (hostname = window.location.hostname) =>
  DISNEY_HOSTS.has(hostname);

// Main Disney+ content extractor.
export const getDisneyContent = () => {
  const url = urlFromMeta();
  const resolvedUrl = resolveUrl(url);
  const platformItemId = extractIdFromPath(
    resolvedUrl?.pathname || window.location.pathname
  );

  if (!platformItemId) return null;

  return buildContent({
    platformItemId,
    title: titleFromPage(),
    year: yearFromPage(),
    url: resolvedUrl?.toString() || url
  });
};
