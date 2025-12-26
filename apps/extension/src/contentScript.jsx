import React from 'react';
import { createRoot } from 'react-dom/client';
import SidebarApp from './SidebarApp';
import { enrichContentWithTmdb, getActiveContent } from './contentSources';

const HOST_ID = 'popcorn-extension-host';
const STYLE_ID = 'popcorn-extension-style';

let root = null;
let host = null;
let currentKey = null;
let currentContent = null;
let isOpen = false;
let syncQueued = false;
let tmdbRequestId = 0;

const ensureGlobalStyles = () => {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --popcorn-sidebar-width: min(420px, 85vw);
    }

    body.popcorn-sidebar-open,
    body.popcorn-sidebar-open .appMountPoint,
    body.popcorn-sidebar-open [data-uia="preview-modal-container-DETAIL_MODAL"] {
      margin-right: var(--popcorn-sidebar-width);
      transition: margin-right 0.3s ease-in-out;
    }
  `;

  document.head.appendChild(style);
};

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

const setOpen = (nextOpen) => {
  isOpen = nextOpen;
  if (host) {
    host.setAttribute('data-open', String(nextOpen));
  }
  document.body.classList.toggle('popcorn-sidebar-open', nextOpen);
  render();
};

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

const scheduleSync = () => {
  if (syncQueued) return;
  syncQueued = true;
  window.requestAnimationFrame(() => {
    syncQueued = false;
    syncContent();
  });
};

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
