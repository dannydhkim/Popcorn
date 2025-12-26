const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const DISNEY_HOSTS = new Set(['disneyplus.com', 'www.disneyplus.com']);
const DEFAULT_TITLE = 'Disney+ title';

const safeText = (value) => (value ? value.trim() : '');

const extractIdFromPath = (path) => {
  if (!path) return null;
  const match = path.match(UUID_REGEX);
  return match ? match[0] : null;
};

const titleFromPage = () => {
  const titleNode =
    document.querySelector('[data-testid="title"]') ||
    document.querySelector('[data-testid="hero-title"]') ||
    document.querySelector('h1');

  const pageTitle = safeText(document.title.replace('| Disney+', ''));
  return safeText(titleNode?.textContent) || pageTitle;
};

const urlFromMeta = () => {
  const ogUrl = document.querySelector('meta[property="og:url"]');
  return ogUrl?.content || window.location.href;
};

const resolveUrl = (href) => {
  if (!href) return null;
  try {
    return new URL(href, window.location.origin);
  } catch (error) {
    return null;
  }
};

const buildContent = ({ id, title, url }) => {
  if (!id) return null;
  return {
    key: `disney:${id}`,
    provider: 'disney',
    providerId: id,
    providerType: 'uuid',
    title: title || '',
    fallbackTitle: DEFAULT_TITLE,
    url,
    source: 'page'
  };
};

export const isDisneyHost = (hostname = window.location.hostname) =>
  DISNEY_HOSTS.has(hostname);

export const getDisneyContent = () => {
  const url = urlFromMeta();
  const resolvedUrl = resolveUrl(url);
  const contentId = extractIdFromPath(resolvedUrl?.pathname || window.location.pathname);

  if (!contentId) return null;

  return buildContent({
    id: contentId,
    title: titleFromPage(),
    url: resolvedUrl?.toString() || url
  });
};
