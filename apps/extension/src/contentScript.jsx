import React from 'react';
import { createRoot } from 'react-dom/client';
import SidebarApp from './SidebarApp';
import { enrichContentWithTmdb, getActiveContent } from './contentSources';

// DOM ids used to locate the injected host + style elements.
const HOST_ID = 'popcorn-extension-host';
const STYLE_ID = 'popcorn-extension-style';

// Shared state for the injected sidebar lifecycle.
let root = null;
let host = null;
let currentKey = null;
let currentContent = null;
let isOpen = false;
let syncQueued = false;
let tmdbRequestId = 0;

// Inject global page-level styles for layout shifts when the sidebar opens.
const ensureGlobalStyles = () => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --popcorn-sidebar-width: min(420px, 25vw);
    }

    body.popcorn-sidebar-open,
    body.popcorn-sidebar-open .appMountPoint,
    body.popcorn-sidebar-open [data-uia="preview-modal-container-DETAIL_MODAL"] {
      margin-right: var(--popcorn-sidebar-width);
      transition: margin-right 0.3s ease-in-out;
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
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
      cursor: pointer;
      padding: 4px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .popcorn-cornelius-button:hover {
      transform: translateY(-1px) scale(1.02);
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.45);
    }

    .popcorn-cornelius-button.is-open {
      box-shadow: 0 0 0 3px rgba(239, 62, 58, 0.45);
    }

    .popcorn-cornelius-icon {
      width: 52px;
      height: 52px;
      display: block;
    }
  `;

  document.head.appendChild(style);
};

// Create or re-use the shadow root host for the sidebar React tree.
const ensureHost = () => {
  const existing = document.getElementById(HOST_ID);
  if (existing) {
    host = existing;
    const mount = host.shadowRoot?.getElementById('popcorn-extension-root');
    if (mount && mount.__popcornRoot) {
      root = mount.__popcornRoot;
    } else if (mount) {
      root = createRoot(mount);
      mount.__popcornRoot = root;
    }
    return;
  }

  host = document.createElement('div');
  host.id = HOST_ID;

  const shadow = host.attachShadow({ mode: 'open' });
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('sidebar.css');

  const mount = document.createElement('div');
  mount.id = 'popcorn-extension-root';

  shadow.appendChild(styleLink);
  shadow.appendChild(mount);

  document.body.appendChild(host);
  root = createRoot(mount);
  mount.__popcornRoot = root;
};

// Render the sidebar UI into the shadow root.
const render = () => {
  if (!root) return;
  root.render(
    <SidebarApp
      content={currentContent}
      isOpen={isOpen}
      onToggle={() => setOpen(!isOpen)}
    />
  );
};

// Toggle UI state and sync the host DOM attributes.
const setOpen = (nextOpen) => {
  isOpen = nextOpen;
  if (host) {
    host.setAttribute('data-open', String(nextOpen));
  }
  document.body.classList.toggle('popcorn-sidebar-open', nextOpen);
  render();
};

// Pull active content, update state, and attach TMDB metadata.
const syncContent = () => {
  const nextContent = getActiveContent();

  if (!nextContent?.key) {
    if (currentKey !== null) {
      currentKey = null;
      currentContent = null;
      render();
    }
    return;
  }

  if (nextContent.key === currentKey) return;
  currentKey = nextContent.key;
  currentContent = nextContent;
  render();

  const requestId = ++tmdbRequestId;
  enrichContentWithTmdb(nextContent).then((enriched) => {
    if (!enriched) return;
    if (requestId !== tmdbRequestId) return;
    if (currentKey !== nextContent.key) return;
    currentContent = enriched;
    render();
  });
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
