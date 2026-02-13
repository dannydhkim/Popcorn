import React from 'react';
import { createRoot } from 'react-dom/client';
import SidebarApp from './SidebarApp';
import { enrichContentWithTmdb, getActiveContent } from './contentSources';
import { captureNetflixContentUrl } from './contentUrls';
import { clearNetflixCaches } from './netflix';

// DOM ids used to locate the injected host + style elements.
const HOST_ID = 'popcorn-extension-host';
const STYLE_ID = 'popcorn-extension-style';
const FRAME_ID = 'popcorn-extension-frame';

// Shared state for the injected sidebar lifecycle.
let root = null;
let host = null;
let frame = null;
let currentPlatformItemId = null;
let currentContent = null;
let isOpen = false;
let isVideoPlayer = false;
let syncQueued = false;
let tmdbRequestId = 0;
let isClosing = false;
let closeTimer = null;
let lastUrl = window.location.href;

const CLOSE_ANIMATION_MS = 350;

// Inject global page-level styles for layout shifts when the sidebar opens.
const ensureGlobalStyles = () => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --popcorn-sidebar-width: min(420px, 25vw);
    }

    body.popcorn-video-player .watch-video,
    body.popcorn-video-player [data-uia="watch-video"],
    body.popcorn-video-player .watch-video--player-view,
    body.popcorn-video-player [data-uia="watch-video-player-view-minimized"],
    body.popcorn-video-player [data-uia="player"],
    body.popcorn-video-player [data-uia="player-controls"],
    body.popcorn-video-player [data-uia="player-controls-container"],
    body.popcorn-video-player .watch-video--evidence-overlay-container,
    body.popcorn-video-player [data-uia="evidence-overlay"],
    body.popcorn-video-player [data-uia="video-canvas"] {
      transition: width 0.35s cubic-bezier(0.2, 0, 0, 1), max-width 0.35s cubic-bezier(0.2, 0, 0, 1), right 0.35s cubic-bezier(0.2, 0, 0, 1), left 0.35s cubic-bezier(0.2, 0, 0, 1) !important;
      will-change: width, max-width, right, left;
    }

    body.popcorn-video-player video {
      transition: left 0.35s cubic-bezier(0.2, 0, 0, 1) !important;
      will-change: left;
    }

    body.popcorn-video-player.popcorn-sidebar-open .watch-video,
    body.popcorn-video-player.popcorn-sidebar-open [data-uia="watch-video"] {
      width: calc(100% - var(--popcorn-sidebar-width)) !important;
      max-width: calc(100% - var(--popcorn-sidebar-width )) !important;
      left: 0 !important;
      box-sizing: border-box;
    }

    body.popcorn-video-player.popcorn-sidebar-open .watch-video [data-uia="watch-video"],
    body.popcorn-video-player.popcorn-sidebar-open [data-uia="watch-video"] .watch-video {
      width: 100% !important;
      max-width: 100% !important;
      right: 0 !important;
      left: 0 !important;
      box-sizing: border-box;
    }

    body.popcorn-video-player.popcorn-sidebar-open .watch-video--player-view,
    body.popcorn-video-player.popcorn-sidebar-open [data-uia="watch-video-player-view-minimized"],
    body.popcorn-video-player.popcorn-sidebar-open [data-uia="player"],
    body.popcorn-video-player.popcorn-sidebar-open [data-uia="player-controls"],
    body.popcorn-video-player.popcorn-sidebar-open [data-uia="player-controls-container"],
    body.popcorn-video-player.popcorn-sidebar-open .watch-video--evidence-overlay-container,
    body.popcorn-video-player.popcorn-sidebar-open [data-uia="evidence-overlay"],
    body.popcorn-video-player.popcorn-sidebar-open [data-uia="video-canvas"] {
      width: 100% !important;
      max-width: 100% !important;
      right: 0 !important;
      left: 0 !important;
      box-sizing: border-box;
    }

    body.popcorn-video-player.popcorn-sidebar-open video {
      width: 100% !important;
      max-width: 100% !important;
      height: 100% !important;
      left: calc(100%-var(--popcorn-sidebar-width)) !important;
      right: 0 !important;
    }

    .cornelius-portal {
      display: inline-flex;
      align-items: center;
      margin-left: 12px;
    }

    .popcorn-cornelius-button {
      border: none;
      border-radius: 999px;
      background: linear-gradient(135deg, #ffffff 0%, #ef3e3a 100%);
      width: 54px;
      height: 54px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8);
      cursor: pointer;
      padding: 4px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .popcorn-cornelius-button:hover {
      transform: translateY(-1px) scale(1.02);
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.8);
    }

    .popcorn-cornelius-button.is-closed {
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.8);
    }

    .popcorn-cornelius-button.is-open {
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.8);
    }

    .popcorn-cornelius-icon {
      width: 52px;
      height: 52px;
      display: block;
    }
  `;

  document.head.appendChild(style);
};

const buildFrameHtml = () => {
  const cssUrl = chrome.runtime.getURL('sidebar.css');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="${cssUrl}" />
  </head>
  <body>
    <div id="popcorn-extension-root"></div>
  </body>
</html>`;
};

const ensureFrameRoot = () => {
  const frameDocument = frame?.contentDocument;
  if (!frameDocument) return;
  const mount = frameDocument.getElementById('popcorn-extension-root');
  if (!mount) return;
  if (mount.__popcornRoot) {
    root = mount.__popcornRoot;
    return;
  }
  root = createRoot(mount);
  mount.__popcornRoot = root;
};

const syncFrameStyle = () => {
  if (!frame) return;
  const shouldShowEdge = isVideoPlayer && !isOpen;
  const width = isOpen || isClosing
    ? 'var(--popcorn-sidebar-width)'
    : shouldShowEdge
    ? '120px'
    : '0px';
  frame.style.width = width;
  frame.style.height = '100vh'
  frame.style.position = 'fixed';
  frame.style.top = shouldShowEdge ?'10vh' :'0';
  frame.style.right = '0';
  frame.style.border = '0';
  frame.style.background = 'transparent';
  frame.style.zIndex = '2147483646';
  frame.style.pointerEvents = isOpen || (!isClosing && shouldShowEdge) ? 'auto' : 'none';
};

// Create or re-use the iframe host for the sidebar React tree.
const ensureHost = () => {
  const existing = document.getElementById(HOST_ID);
  if (existing) {
    host = existing;
    frame = host.querySelector('iframe');
    if (frame) {
      if (frame.contentDocument?.readyState === 'complete') {
        ensureFrameRoot();
      } else {
        frame.addEventListener('load', () => {
          ensureFrameRoot();
          render();
        });
      }
    }
    return;
  }

  host = document.createElement('div');
  host.id = HOST_ID;
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.right = '0';
  host.style.width = '0';
  host.style.height = '0';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'none';

  frame = document.createElement('iframe');
  frame.id = FRAME_ID;
  frame.setAttribute('title', 'Popcorn sidebar');
  frame.setAttribute('aria-hidden', 'true');
  frame.srcdoc = buildFrameHtml();
  frame.addEventListener('load', () => {
    ensureFrameRoot();
    render();
  });
  host.appendChild(frame);

  document.body.appendChild(host);
  syncFrameStyle();
};

const syncBodyClasses = () => {
  if (!document.body) return;
  document.body.classList.toggle('popcorn-sidebar-open', isOpen);
  document.body.classList.toggle('popcorn-video-player', isVideoPlayer);
  syncFrameStyle();
};

const isVideoPlayerPath = () => window.location.pathname.includes('/watch');

const getVideoPlayerMode = (content) => {
  if (content?.provider === 'netflix' && content?.providerType === 'watch') {
    return true;
  }
  return isVideoPlayerPath();
};

// Render the sidebar UI into the shadow root.
const render = () => {
  if (!root) return;
  root.render(
    <SidebarApp
      content={currentContent}
      isOpen={isOpen}
      isVideoPlayer={isVideoPlayer}
      onToggle={() => setOpen(!isOpen)}
    />
  );
};

// Toggle UI state and sync the host DOM attributes.
const setOpen = (nextOpen) => {
  const wasOpen = isOpen;
  isOpen = nextOpen;
  if (closeTimer) {
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }
  if (!nextOpen) {
    isClosing = true;
    closeTimer = window.setTimeout(() => {
      isClosing = false;
      syncFrameStyle();
    }, CLOSE_ANIMATION_MS);
  } else {
    isClosing = false;
  }
  if (host) {
    host.setAttribute('data-open', String(nextOpen));
  }
  syncBodyClasses();
  render();

  // Only enrich with TMDB when opening the sidebar (user shows intent)
  if (nextOpen && !wasOpen && currentContent) {
    const requestId = ++tmdbRequestId;
    enrichContentWithTmdb(currentContent).then((enriched) => {
      if (!enriched) return;
      if (requestId !== tmdbRequestId) return;
      if (currentPlatformItemId !== currentContent.platformItemId) return;
      currentContent = enriched;
      render();
    });
  }
};

// Pull active content, update state, and attach TMDB metadata.
const syncContent = () => {
  // Clear Netflix caches when URL changes to ensure fresh captures
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    clearNetflixCaches();
  }

  const nextContent = getActiveContent();

  const nextIsVideoPlayer = getVideoPlayerMode(nextContent);
  if (nextIsVideoPlayer !== isVideoPlayer) {
    isVideoPlayer = nextIsVideoPlayer;
    syncBodyClasses();
    render();
  }

  if (!nextContent?.platformItemId) {
    if (currentPlatformItemId !== null) {
      currentPlatformItemId = null;
      currentContent = null;
      render();
    }
    return;
  }

  if (nextContent.platformItemId === currentPlatformItemId) return;
  currentPlatformItemId = nextContent.platformItemId;
  currentContent = nextContent;
  render();

  // Upload platform ID in the background
  captureNetflixContentUrl().catch((error) => {
    console.error('[contentScript] captureNetflixContentUrl failed:', error);
  });

  // TMDB enrichment now only happens when sidebar is opened (see setOpen)
  // This prevents wasteful API calls on every hover
};

// Batch repeated DOM mutations into a single sync pass.
const scheduleSync = () => {
  if (syncQueued) return;
  syncQueued = true;
  window.requestAnimationFrame(() => {
    syncQueued = false;
    syncContent();
  });
};

// Watch for navigation and DOM changes that imply content changed.
const observePage = () => {
  if (!document.body) return;
  if (!window.__popcornObserver) {
    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
    window.__popcornObserver = observer;
  }

  if (!window.__popcornHistoryPatched) {
    window.addEventListener('popstate', scheduleSync);

    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      scheduleSync();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      scheduleSync();
    };

    window.__popcornHistoryPatched = true;
  }

  if (!window.__popcornKeyHandler) {
    const handler = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    window.__popcornKeyHandler = handler;
  }

  if (!window.__popcornHoverHandler) {
    const handler = () => {
      scheduleSync();
    };
    document.addEventListener('pointerover', handler, true);
    document.addEventListener('focusin', handler, true);
    window.__popcornHoverHandler = handler;
  }
};

// Bootstraps the sidebar into the page and starts observation.
const init = () => {
  if (!document.body) {
    window.setTimeout(init, 50);
    return;
  }

  ensureHost();
  ensureGlobalStyles();
  setOpen(false);
  syncContent();
  observePage();
};

init();
