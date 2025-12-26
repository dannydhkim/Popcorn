const TITLE_ID_REGEX = /\/title\/(\d+)/;
const WATCH_ID_REGEX = /\/watch\/(\d+)/;

const NETFLIX_HOSTS = new Set(['netflix.com', 'www.netflix.com']);
const DEFAULT_TITLE = 'Netflix title';

const safeText = (value) => (value ? value.trim() : '');

const extractIdFromPath = (path) => {
  if (!path) return null;
  const titleMatch = path.match(TITLE_ID_REGEX);
  if (titleMatch) return { id: titleMatch[1], type: 'title' };
  const watchMatch = path.match(WATCH_ID_REGEX);
  if (watchMatch) return { id: watchMatch[1], type: 'watch' };
  return null;
};

const resolveUrl = (href) => {
  if (!href) return null;
  try {
    return new URL(href, window.location.origin);
  } catch (error) {
    return null;
  }
};

const titleFromPreview = (previewNode) => {
  if (!previewNode) return '';
  const titleNode =
    previewNode.querySelector('[data-uia="previewModal--title"]') ||
    previewNode.querySelector('[data-uia="previewModal--title"], [data-uia="previewModal--details-title"]') ||
    previewNode.querySelector('h3, h4');

  return safeText(titleNode?.textContent);
};

const titleFromPage = () => {
  const titleNode =
    document.querySelector('[data-uia="video-title"]') ||
    document.querySelector('[data-uia="title-info-title"]') ||
    document.querySelector('h1');

  return safeText(titleNode?.textContent) || safeText(document.title.replace(' - Netflix', ''));
};

const buildContent = ({ id, title, source, url, type }) => {
  if (!id) return null;
  return {
    key: `netflix:${id}`,
    provider: 'netflix',
    providerId: id,
    providerType: type,
    title: title || '',
    fallbackTitle: DEFAULT_TITLE,
    url,
    source
  };
};

export const isNetflixHost = (hostname = window.location.hostname) =>
  NETFLIX_HOSTS.has(hostname);

export const getNetflixContent = () => {
  const preview = document.querySelector('[data-uia="preview-modal-container-DETAIL_MODAL"]');

  if (preview) {
    const previewLink = preview.querySelector('a[href*="/title/"]');
    const previewUrl = resolveUrl(previewLink?.getAttribute('href'));
    const previewInfo = extractIdFromPath(previewUrl?.pathname || previewLink?.getAttribute('href'));

    if (previewInfo?.id) {
      return buildContent({
        id: previewInfo.id,
        title: titleFromPreview(preview),
        source: 'preview',
        url: previewUrl?.toString() || `https://www.netflix.com/title/${previewInfo.id}`,
        type: previewInfo.type
      });
    }
  }

  const locationInfo = extractIdFromPath(window.location.pathname);
  if (locationInfo?.id) {
    return buildContent({
      id: locationInfo.id,
      title: titleFromPage(),
      source: 'page',
      url: window.location.href,
      type: locationInfo.type
    });
  }

  return null;
};
