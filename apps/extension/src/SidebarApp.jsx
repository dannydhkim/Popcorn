import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CommentBox from './commentBox';
import { getProviderLabel, markPlatformIdResolved } from './contentSources';
import {
  confirmContentMapping,
  createComment,
  ensureThread,
  fetchComments,
  fetchContentCatalog,
  getViewerId,
  isSupabaseConfigured,
  supabase,
  updateCommentScore,
  upsertContentPlatformIdLink,
  upsertContentCatalogFromTmdb,
  upsertContentMetadata
} from './supabaseClient';
import {
  fetchTmdbMetadataById,
  isTmdbConfigured,
  searchTmdbCandidates
} from './tmdb';

const PLAY_BUTTON_SELECTORS = [
  'a.primary-button.playLink',
  'button[data-testid="play-button"]',
  'button[aria-label="Play"]',
  'button[aria-label*="Play"]',
  '[data-uia="play-button"]'
];

let corneliusPortalCounter = 0;

const findPlayButtons = () => {
  const matches = new Set();
  for (const selector of PLAY_BUTTON_SELECTORS) {
    document.querySelectorAll(selector).forEach((node) => {
      if (node) matches.add(node);
    });
  }
  return Array.from(matches);
};

const CorneliusToggle = ({ isOpen, onToggle, isVideoPlayer }) => {
  const [portalTargets, setPortalTargets] = useState([]);

  useEffect(() => {
    if (isVideoPlayer) {
      setPortalTargets([]);
      document.querySelectorAll('.cornelius-portal').forEach((node) => {
        node.remove();
      });
      return undefined;
    }
    if (!document.body) return undefined;
    let mounted = true;
    let currentPortals = [];

    const ensurePortals = () => {
      const targets = findPlayButtons().filter((target) => target?.parentElement);
      const portals = targets.map((target) => {
        let portal = target.nextElementSibling;
        if (!portal || !portal.classList?.contains('cornelius-portal')) {
          portal = document.createElement('div');
          portal.className = 'cornelius-portal';
          target.parentElement.insertBefore(portal, target.nextSibling);
        }
        if (!portal.dataset.popcornPortalId) {
          portal.dataset.popcornPortalId = String(++corneliusPortalCounter);
        }
        return portal;
      });
      const portalSet = new Set(portals);
      document.querySelectorAll('.cornelius-portal').forEach((node) => {
        if (!portalSet.has(node)) {
          node.remove();
        }
      });

      if (!mounted) return;
      const same =
        portals.length === currentPortals.length &&
        portals.every((portal, index) => portal === currentPortals[index]);
      if (!same) {
        currentPortals = portals;
        setPortalTargets(portals);
      }
    };

    const observer = new MutationObserver(ensurePortals);
    observer.observe(document.body, { childList: true, subtree: true });
    ensurePortals();

    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [isVideoPlayer]);

  if (!portalTargets.length || isVideoPlayer) return null;
  const iconUrl = chrome.runtime.getURL('cornelius.svg');

  return portalTargets.map((portal) =>
    createPortal(
      <button
        className={`popcorn-cornelius-button${isOpen ? ' is-open' : ''}`}
        type="button"
        onClick={onToggle}
        aria-pressed={isOpen}
        aria-label="Toggle Popcorn sidebar"
      >
        <img className="popcorn-cornelius-icon" src={iconUrl} alt="Popcorn" />
      </button>,
      portal,
      portal.dataset.popcornPortalId
    )
  );
};

const VideoEdgeToggle = ({ isOpen, onToggle, isVideoPlayer }) => {
  if (!isVideoPlayer || isOpen) return null;
  return (
    <button
      className="popcorn-edge-toggle"
      type="button"
      onClick={onToggle}
      aria-label="Open Popcorn sidebar"
    />
  );
};

// Convert ISO timestamps to a compact "time ago" string.
const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  const delta = Date.now() - new Date(timestamp).getTime();
  if (Number.isNaN(delta)) return '';
  const seconds = Math.max(1, Math.floor(delta / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

// Stateless row renderer for a single comment.
const CommentRow = ({ comment, index, onVote, canVote }) => {
  const score = Number.isFinite(comment.score) ? comment.score : 0;

  return (
    <div
      className="popcorn-comment"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="popcorn-votes">
        <button
          className="popcorn-vote-button"
          type="button"
          onClick={() => onVote(comment, score + 1)}
          disabled={!canVote}
          aria-disabled={!canVote}
          aria-label="Upvote"
        >
          ^
        </button>
        <div className="popcorn-score">{score}</div>
        <button
          className="popcorn-vote-button"
          type="button"
          onClick={() => onVote(comment, score - 1)}
          disabled={!canVote}
          aria-disabled={!canVote}
          aria-label="Downvote"
        >
          v
        </button>
      </div>
      <div className="popcorn-comment-body">
        <div className="popcorn-comment-meta">
          <span>{comment.author_label || 'Anonymous'}</span>
          <span className="popcorn-separator">|</span>
          <span>{timeAgo(comment.created_at)}</span>
        </div>
        <p>{comment.body}</p>
      </div>
    </div>
  );
};

const AuthPage = ({
  session,
  status,
  mode,
  email,
  password,
  isBusy,
  error,
  notice,
  disabled,
  onBack,
  onEmailChange,
  onPasswordChange,
  onModeToggle,
  onSubmit,
  onSignOut
}) => {
  const heading = session
    ? 'Account'
    : mode === 'signIn'
    ? 'Sign in'
    : 'Create account';
  const subtitle = session
    ? 'Account access'
    : mode === 'signIn'
    ? 'Welcome back'
    : 'Join the crowd';

  return (
    <div className="popcorn-auth-page">
      <header className="popcorn-auth-header">
        <button className="popcorn-ghost popcorn-back" type="button" onClick={onBack}>
          Back
        </button>
        <div>
          <div className="popcorn-brand">Popcorn!</div>
          <div className="popcorn-tagline">{subtitle}</div>
        </div>
      </header>
      <section className="popcorn-auth">
        <div className="popcorn-auth-title">{heading}</div>
        {status === 'loading' ? (
          <div className="popcorn-muted">Checking session...</div>
        ) : session ? (
          <div className="popcorn-auth-card">
            <div className="popcorn-auth-user">
              Signed in as{' '}
              <span className="popcorn-auth-email">
                {session.user?.email || 'Viewer'}
              </span>
            </div>
            <button
              className="popcorn-ghost"
              type="button"
              onClick={onSignOut}
              disabled={isBusy}
            >
              {isBusy ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        ) : (
          <form className="popcorn-auth-form" onSubmit={onSubmit}>
            <label className="popcorn-label" htmlFor="popcorn-auth-email">
              Email
            </label>
            <input
              className="popcorn-input"
              id="popcorn-auth-email"
              type="email"
              value={email}
              onChange={onEmailChange}
              disabled={disabled || isBusy}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <label className="popcorn-label" htmlFor="popcorn-auth-password">
              Password
            </label>
            <input
              className="popcorn-input"
              id="popcorn-auth-password"
              type="password"
              value={password}
              onChange={onPasswordChange}
              disabled={disabled || isBusy}
              placeholder="Password"
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
            />
            <div className="popcorn-auth-actions">
              <button
                className="popcorn-submit"
                type="submit"
                disabled={disabled || isBusy || !email || !password}
              >
                {isBusy
                  ? mode === 'signIn'
                    ? 'Signing in...'
                    : 'Creating...'
                  : mode === 'signIn'
                  ? 'Sign in'
                  : 'Create account'}
              </button>
              <button
                className="popcorn-auth-switch"
                type="button"
                onClick={onModeToggle}
                disabled={disabled || isBusy}
              >
                {mode === 'signIn'
                  ? 'Need an account?'
                  : 'Already have an account?'}
              </button>
            </div>
          </form>
        )}
        {error ? <div className="popcorn-error">{error}</div> : null}
        {notice ? <div className="popcorn-callout">{notice}</div> : null}
        {!session && disabled ? (
          <div className="popcorn-callout">Sign-in unavailable.</div>
        ) : null}
        {!session && disabled && import.meta?.env?.DEV ? (
          <div className="popcorn-callout">
            Connect Supabase to enable sign-in.
          </div>
        ) : null}
      </section>
    </div>
  );
};

const AccountPage = ({
  session,
  status,
  profile,
  comments,
  commentsStatus,
  commentsError,
  isBusy,
  disabled,
  onBack,
  onSignOut
}) => {
  const displayName = profile?.displayName || 'Viewer';
  const avatarUrl = profile?.avatarUrl || '';
  const bio = profile?.bio || '';
  const email = profile?.email || '';
  const commentCount =
    commentsStatus === 'ready' ? String(comments.length) : '...';

  return (
    <div className="popcorn-auth-page popcorn-account-page">
      <header className="popcorn-auth-header">
        <button className="popcorn-ghost popcorn-back" type="button" onClick={onBack}>
          Back
        </button>
        <div>
          <div className="popcorn-brand">Popcorn!</div>
          <div className="popcorn-tagline">Account</div>
        </div>
      </header>
      <section className="popcorn-account-profile">
        <div
          className="popcorn-avatar"
          style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
          aria-hidden="true"
        >
          {!avatarUrl ? displayName.slice(0, 1).toUpperCase() : null}
        </div>
        <div className="popcorn-account-details">
          <div className="popcorn-account-name">{displayName}</div>
          {email ? <div className="popcorn-muted">{email}</div> : null}
          {bio ? (
            <div className="popcorn-account-bio">{bio}</div>
          ) : (
            <div className="popcorn-muted">Add a bio in your profile metadata.</div>
          )}
        </div>
        <button
          className="popcorn-ghost"
          type="button"
          onClick={onSignOut}
          disabled={disabled || isBusy || status === 'loading' || !session}
        >
          {isBusy ? 'Signing out...' : 'Sign out'}
        </button>
      </section>
      <section className="popcorn-account-grid">
        <div className="popcorn-account-card">
          <div className="popcorn-account-label">Posts</div>
          <div className="popcorn-account-value">0</div>
          <div className="popcorn-muted">Coming soon</div>
        </div>
        <div className="popcorn-account-card">
          <div className="popcorn-account-label">Comments</div>
          <div className="popcorn-account-value">{commentCount}</div>
          <div className="popcorn-muted">Recent activity</div>
        </div>
        <div className="popcorn-account-card">
          <div className="popcorn-account-label">Saved</div>
          <div className="popcorn-account-value">0</div>
          <div className="popcorn-muted">Coming soon</div>
        </div>
        <div className="popcorn-account-card">
          <div className="popcorn-account-label">Lists</div>
          <div className="popcorn-account-value">0</div>
          <div className="popcorn-muted">Coming soon</div>
        </div>
      </section>
      <section className="popcorn-account-section">
        <div className="popcorn-section-title">Your comments</div>
        {commentsStatus === 'loading' ? (
          <div className="popcorn-muted">Loading your comments...</div>
        ) : null}
        {commentsStatus === 'error' ? (
          <div className="popcorn-error">{commentsError}</div>
        ) : null}
        {commentsStatus === 'ready' && comments.length === 0 ? (
          <div className="popcorn-muted">No comments yet.</div>
        ) : null}
        {comments.map((comment) => (
          <div className="popcorn-account-comment" key={comment.id}>
            <div className="popcorn-account-comment-meta">
              {timeAgo(comment.created_at)}
            </div>
            <div className="popcorn-account-comment-body">{comment.body}</div>
          </div>
        ))}
      </section>
    </div>
  );
};

// Main sidebar UI driven by current content and Supabase data.
const SidebarApp = ({ content, isOpen, onToggle, isVideoPlayer }) => {
  const [authSession, setAuthSession] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authMode, setAuthMode] = useState('signIn');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [activeView, setActiveView] = useState('main');
  // Thread + comments.
  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  // Catalog metadata (content_catalog + mapping) state.
  const [catalogEntry, setCatalogEntry] = useState(null);
  const [catalogStatus, setCatalogStatus] = useState('idle');
  const [isSavingMatch, setIsSavingMatch] = useState(false);
  const [accountComments, setAccountComments] = useState([]);
  const [accountCommentsStatus, setAccountCommentsStatus] = useState('idle');
  const [accountCommentsError, setAccountCommentsError] = useState('');
  const [isFixOpen, setIsFixOpen] = useState(false);
  const [fixQuery, setFixQuery] = useState('');
  const [fixCandidates, setFixCandidates] = useState([]);
  const [fixStatus, setFixStatus] = useState('idle');
  const [fixError, setFixError] = useState('');
  const [selectedFixKey, setSelectedFixKey] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [mismatchDismissed, setMismatchDismissed] = useState(false);
  const fixRequestRef = useRef(0);

  // Content readiness and labels for the header.
  const isReady = Boolean(content && content.key);
  const catalogPlatformItemId = content?.platformItemId || '';
  const providerLabel = content?.provider
    ? getProviderLabel(content.provider)
    : 'Streaming';
  const badgeLabel = content?.source === 'preview' ? 'Preview' : 'Page';

  // Collate display metadata from catalog or TMDB fallback.
  const displayTitle =
    catalogEntry?.title ||
    content?.tmdb?.title ||
    content?.title ||
    content?.fallbackTitle ||
    'Pick a title';
  const displayYear = catalogEntry?.year || content?.tmdb?.year;
  const displayGenres = catalogEntry?.genres || content?.tmdb?.genres || [];
  const displayRating = Number.isFinite(catalogEntry?.rating)
    ? catalogEntry.rating
    : content?.tmdb?.rating;
  const displayOverview = catalogEntry?.overview || content?.tmdb?.overview;
  const metadataLine = [
    displayYear,
    displayGenres.length ? displayGenres.slice(0, 3).join(', ') : '',
    Number.isFinite(displayRating) ? `${displayRating.toFixed(1)} / 10` : ''
  ]
    .filter(Boolean)
    .join(' | ');
  const tmdbMatchSummary = content?.tmdb
    ? [
        content.tmdb.title,
        content.tmdb.year ? `(${content.tmdb.year})` : ''
      ]
        .filter(Boolean)
        .join(' ')
    : '';

  // Helper message for missing Supabase config.
  const connectionMessage = useMemo(() => {
    if (isSupabaseConfigured) return '';
    return 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to connect.';
  }, []);

  // Helper message for missing TMDB config.
  const tmdbMessage = useMemo(() => {
    if (isTmdbConfigured) return '';
    return 'Add VITE_TMDB_API_KEY to .env for title + genre metadata.';
  }, []);

  const isAuthenticated = Boolean(authSession?.user);
  const profile = {
    displayName:
      authSession?.user?.user_metadata?.display_name ||
      authSession?.user?.user_metadata?.full_name ||
      authSession?.user?.email ||
      '',
    email: authSession?.user?.email || '',
    avatarUrl:
      authSession?.user?.user_metadata?.avatar_url ||
      authSession?.user?.user_metadata?.avatar ||
      authSession?.user?.user_metadata?.picture ||
      '',
    bio:
      authSession?.user?.user_metadata?.bio ||
      authSession?.user?.user_metadata?.about ||
      ''
  };
  const authName =
    authSession?.user?.user_metadata?.display_name ||
    authSession?.user?.user_metadata?.full_name ||
    authSession?.user?.email ||
    '';
  const greetingName = isAuthenticated
    ? authName || 'Viewer'
    : authStatus === 'loading'
    ? '...'
    : 'Guest';

  useEffect(() => {
    if (isAuthenticated && activeView === 'auth') {
      setActiveView('main');
    }
  }, [isAuthenticated, activeView]);

  useEffect(() => {
    setMismatchDismissed(false);
    setIsFixOpen(false);
    setFixQuery('');
    setFixCandidates([]);
    setFixStatus('idle');
    setFixError('');
    setSelectedFixKey('');
  }, [content?.key]);

  useEffect(() => {
    if (!isAuthenticated && activeView === 'account') {
      setActiveView('main');
    }
  }, [isAuthenticated, activeView]);

  useEffect(() => {
    let isActive = true;

    if (!isSupabaseConfigured) {
      setAuthSession(null);
      setAuthStatus('idle');
      return () => {
        isActive = false;
      };
    }

    setAuthStatus('loading');

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isActive) return;
        setAuthSession(data?.session || null);
        setAuthStatus('ready');
      })
      .catch(() => {
        if (!isActive) return;
        setAuthStatus('ready');
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) return;
      setAuthSession(session || null);
      setAuthStatus('ready');
    });

    return () => {
      isActive = false;
      data?.subscription?.unsubscribe();
    };
  }, [isSupabaseConfigured]);

  // Load catalog metadata for this provider id.
  useEffect(() => {
    let isActive = true;

    if (!isReady || !isSupabaseConfigured || !catalogPlatformItemId) {
      setCatalogEntry(null);
      setCatalogStatus('idle');
      return () => {
        isActive = false;
      };
    }

    setCatalogStatus('loading');
    setCatalogEntry(null);

    fetchContentCatalog({
      provider: content.provider,
      platformItemId: catalogPlatformItemId
    })
      .then((entry) => {
        if (!isActive) return;
        if (entry) {
          setCatalogEntry(entry);
          setCatalogStatus('ready');
        } else {
          setCatalogStatus('missing');
        }
      })
      .catch(() => {
        if (!isActive) return;
        setCatalogStatus('error');
      });

    return () => {
      isActive = false;
    };
  }, [content?.provider, catalogPlatformItemId, isReady, isSupabaseConfigured]);

  // Load thread and comments whenever the content changes.
  useEffect(() => {
    let isActive = true;

    if (!isReady || !isSupabaseConfigured) {
      setThread(null);
      setComments([]);
      setStatus('idle');
      return () => {
        isActive = false;
      };
    }

    const loadThread = async () => {
      setStatus('loading');
      setError('');
      setThread(null);
      setComments([]);

      try {
        const nextThread = await ensureThread({
          contentKey: content.key,
          contentTitle:
            catalogEntry?.title ||
            content?.tmdb?.title ||
            content.title ||
            content.fallbackTitle,
          contentUrl: content.url,
          contentProvider: content.provider,
          contentPlatformItemId: catalogPlatformItemId,
          tmdbMetadata: catalogEntry?.tmdb_metadata || content.tmdb
        });
        if (!isActive) return;
        const nextComments = await fetchComments(nextThread.id);
        if (!isActive) return;
        setThread(nextThread);
        setComments(nextComments);
        setStatus('ready');
      } catch (err) {
        if (!isActive) return;
        setStatus('error');
        setError('Unable to load comments.');
      }
    };

    loadThread();

    return () => {
      isActive = false;
    };
  }, [content?.key, content?.title, content?.url, isReady]);

  // Listen for comment updates on the active thread.
  useEffect(() => {
    if (!thread?.id || !isSupabaseConfigured) return undefined;

    let isActive = true;
    const channel = supabase
      .channel(`comments:${thread.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `thread_id=eq.${thread.id}`
        },
        (payload) => {
          if (!isActive) return;
          setComments((prev) => {
            if (payload.eventType === 'INSERT') {
              const exists = prev.some((comment) => comment.id === payload.new?.id);
              if (exists) return prev;
              return payload.new ? [payload.new, ...prev] : prev;
            }
            if (payload.eventType === 'UPDATE') {
              if (!payload.new) return prev;
              return prev.map((comment) =>
                comment.id === payload.new.id ? { ...comment, ...payload.new } : comment
              );
            }
            if (payload.eventType === 'DELETE') {
              if (!payload.old) return prev;
              return prev.filter((comment) => comment.id !== payload.old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, [thread?.id, isSupabaseConfigured]);

  useEffect(() => {
    let isActive = true;

    if (
      !isAuthenticated ||
      !isSupabaseConfigured ||
      activeView !== 'account' ||
      !authSession?.user?.id
    ) {
      setAccountComments([]);
      setAccountCommentsStatus('idle');
      setAccountCommentsError('');
      return () => {
        isActive = false;
      };
    }

    setAccountCommentsStatus('loading');
    setAccountCommentsError('');

    supabase
      .from('comments')
      .select('id, body, created_at')
      .eq('author_id', authSession.user.id)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data, error: commentError }) => {
        if (!isActive) return;
        if (commentError) throw commentError;
        setAccountComments(data || []);
        setAccountCommentsStatus('ready');
      })
      .catch(() => {
        if (!isActive) return;
        setAccountCommentsStatus('error');
        setAccountCommentsError('Unable to load your comments.');
      });

    return () => {
      isActive = false;
    };
  }, [activeView, authSession?.user?.id, isAuthenticated, isSupabaseConfigured]);

  const matchConfidence = catalogEntry?.id
    ? 'high'
    : content?.tmdb
    ? 'medium'
    : 'low';

  const fixLinkTone =
    matchConfidence === 'high'
      ? 'is-quiet'
      : matchConfidence === 'medium'
      ? 'is-medium'
      : 'is-strong';

  const currentCandidate = useMemo(() => {
    if (catalogEntry?.tmdb_id && catalogEntry?.tmdb_type) {
      return {
        key: `${catalogEntry.tmdb_type}:${catalogEntry.tmdb_id}`,
        tmdbId: catalogEntry.tmdb_id,
        mediaType: catalogEntry.tmdb_type,
        title: catalogEntry.title || 'Untitled',
        year: catalogEntry.year || '',
        posterUrl:
          catalogEntry.poster_url || catalogEntry.tmdb_metadata?.posterPath || '',
        network: catalogEntry.tmdb_metadata?.network || '',
        studio: catalogEntry.tmdb_metadata?.studio || '',
        isCurrent: true,
        tmdbMetadata: catalogEntry.tmdb_metadata || null
      };
    }

    if (content?.tmdb?.id && content?.tmdb?.mediaType) {
      return {
        key: `${content.tmdb.mediaType}:${content.tmdb.id}`,
        tmdbId: content.tmdb.id,
        mediaType: content.tmdb.mediaType,
        title: content.tmdb.title || content.tmdb.originalTitle || 'Untitled',
        year: content.tmdb.year || '',
        posterUrl: content.tmdb.posterPath || '',
        network: content.tmdb.network || '',
        studio: content.tmdb.studio || '',
        isCurrent: false,
        isSuggested: true,
        tmdbMetadata: content.tmdb || null
      };
    }

    return null;
  }, [catalogEntry, content?.tmdb]);

  const mergeCandidates = (primary, list) => {
    const merged = new Map();
    if (primary) merged.set(primary.key, primary);
    list.forEach((candidate) => {
      if (!candidate?.key) return;
      if (!merged.has(candidate.key)) {
        merged.set(candidate.key, candidate);
        return;
      }
      const existing = merged.get(candidate.key);
      merged.set(candidate.key, {
        ...candidate,
        ...existing,
        isCurrent: existing.isCurrent || candidate.isCurrent,
        isSuggested: existing.isSuggested || candidate.isSuggested
      });
    });
    return Array.from(merged.values());
  };

  const loadFixCandidates = async (query) => {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      setFixCandidates(currentCandidate ? [currentCandidate] : []);
      setFixStatus('ready');
      return;
    }

    if (!isTmdbConfigured) {
      setFixCandidates(currentCandidate ? [currentCandidate] : []);
      setFixStatus('ready');
      setFixError('Add VITE_TMDB_API_KEY to search TMDB.');
      return;
    }

    const requestId = ++fixRequestRef.current;
    setFixStatus('loading');
    setFixError('');

    try {
      const results = await searchTmdbCandidates({
        query: trimmed,
        year: displayYear
      });
      if (requestId !== fixRequestRef.current) return;
      const mapped = (results || []).map((candidate) => ({
        key: `${candidate.mediaType}:${candidate.id}`,
        tmdbId: candidate.id,
        mediaType: candidate.mediaType,
        title: candidate.title,
        year: candidate.year || '',
        posterUrl: candidate.posterUrl || '',
        network: candidate.network || '',
        studio: candidate.studio || '',
        isCurrent: false,
        tmdbMetadata: null
      }));

      const combined = mergeCandidates(currentCandidate, mapped).sort((a, b) => {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return 0;
      });
      const trimmed = combined.slice(0, 7);

      setFixCandidates(trimmed);
      setFixStatus('ready');
      setSelectedFixKey((prev) => {
        if (prev && trimmed.some((candidate) => candidate.key === prev)) return prev;
        return trimmed[0]?.key || '';
      });
    } catch (err) {
      if (requestId !== fixRequestRef.current) return;
      setFixStatus('error');
      setFixError('Unable to load candidates.');
      setFixCandidates(currentCandidate ? [currentCandidate] : []);
    }
  };

  useEffect(() => {
    if (!isFixOpen) return undefined;
    const query = fixQuery.trim() || displayTitle;
    const delay = fixQuery.trim() ? 250 : 0;
    const timer = window.setTimeout(() => {
      loadFixCandidates(query);
    }, delay);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isFixOpen, fixQuery, displayTitle, displayYear, currentCandidate]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => {
      setToastMessage('');
    }, 2400);
    return () => {
      window.clearTimeout(timer);
    };
  }, [toastMessage]);

  const openFixModal = () => {
    if (!isReady) return;
    setIsFixOpen(true);
    setFixError('');
    setFixStatus('loading');
    setFixQuery('');
    setFixCandidates(currentCandidate ? [currentCandidate] : []);
    setSelectedFixKey(currentCandidate?.key || '');
  };

  const closeFixModal = () => {
    setIsFixOpen(false);
  };

  const handleSaveMatch = async () => {
    const candidate = fixCandidates.find(
      (item) => item.key === selectedFixKey
    );
    if (!candidate || !content?.provider || !catalogPlatformItemId) return;
    if (!isSupabaseConfigured) {
      setFixError('Connect Supabase to save matches.');
      return;
    }

    setIsSavingMatch(true);
    setFixError('');

    try {
      let tmdbMetadata = candidate.tmdbMetadata || null;
      if (!tmdbMetadata && !isTmdbConfigured) {
        setFixError('Add VITE_TMDB_API_KEY to load TMDB details.');
        return;
      }
      if (!tmdbMetadata) {
        tmdbMetadata = await fetchTmdbMetadataById(
          candidate.mediaType,
          candidate.tmdbId
        );
      }
      if (!tmdbMetadata) {
        setFixError('Unable to load TMDB details.');
        return;
      }

      const catalog = await upsertContentCatalogFromTmdb(tmdbMetadata);
      if (!catalog) {
        setFixError('Catalog tables are missing. Apply supabase/schema.sql.');
        return;
      }

      const mapping = await confirmContentMapping({
        provider: content.provider,
        platformItemId: catalogPlatformItemId,
        contentCatalogId: catalog.id,
        viewerId: authSession?.user?.id || getViewerId(),
        tmdbMetadata
      });

      if (!mapping) {
        setFixError('Catalog tables are missing. Apply supabase/schema.sql.');
        return;
      }

      const metadataRecord = await upsertContentMetadata({
        url: content.url,
        platform: content.provider,
        platformItemId: catalogPlatformItemId,
        title: content.title,
        yearReleased: content.year,
        tmdbId: tmdbMetadata.id,
        tmdbMetadata,
        contentType: tmdbMetadata.mediaType,
        imdbId: tmdbMetadata.imdbId,
        wikidataId: tmdbMetadata.wikidataId
      });

      if (!metadataRecord?.id) {
        setFixError('Content metadata table is missing. Apply supabase/schema.sql.');
        return;
      }

      const platformLink = await upsertContentPlatformIdLink({
        source: content.provider,
        platformId: catalogPlatformItemId,
        contentId: metadataRecord.id,
        url: content.url
      });

      if (!platformLink) {
        setFixError(
          'Content platform ids table is missing. Apply supabase/schema.sql.'
        );
        return;
      }

      markPlatformIdResolved({
        source: content.provider,
        platformId: catalogPlatformItemId,
        contentId: metadataRecord.id
      });

      setCatalogEntry(catalog);
      setCatalogStatus('ready');
      setIsFixOpen(false);
      setMismatchDismissed(true);
      setToastMessage('Match updated.');
    } catch (err) {
      setFixError('Unable to save match.');
    } finally {
      setIsSavingMatch(false);
    }
  };

  // Create a new comment and prepend it in the UI.
  const handleSubmit = async (text) => {
    if (!thread || !isAuthenticated) return;
    const nextComment = await createComment({
      threadId: thread.id,
      body: text,
      author: authSession?.user || null
    });
    setComments((prev) => [nextComment, ...prev]);
  };

  // Optimistically update the vote UI and roll back on error.
  const handleVote = async (comment, nextScore) => {
    if (!isAuthenticated) return;
    const previousScore = Number.isFinite(comment.score) ? comment.score : 0;

    setComments((prev) =>
      prev.map((item) =>
        item.id === comment.id ? { ...item, score: nextScore } : item
      )
    );

    try {
      await updateCommentScore({
        commentId: comment.id,
        score: nextScore
      });
    } catch (err) {
      setComments((prev) =>
        prev.map((item) =>
          item.id === comment.id ? { ...item, score: previousScore } : item
        )
      );
    }
  };

  const handleAuthEmailChange = (event) => {
    setAuthEmail(event.target.value);
    if (authError) setAuthError('');
    if (authNotice) setAuthNotice('');
  };

  const handleAuthPasswordChange = (event) => {
    setAuthPassword(event.target.value);
    if (authError) setAuthError('');
    if (authNotice) setAuthNotice('');
  };

  const handleAuthModeToggle = () => {
    setAuthMode((prev) => (prev === 'signIn' ? 'signUp' : 'signIn'));
    setAuthError('');
    setAuthNotice('');
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    if (!authEmail || !authPassword || !isSupabaseConfigured) return;

    setAuthBusy(true);
    setAuthError('');
    setAuthNotice('');

    try {
      const response =
        authMode === 'signIn'
          ? await supabase.auth.signInWithPassword({
              email: authEmail,
              password: authPassword
            })
          : await supabase.auth.signUp({
              email: authEmail,
              password: authPassword
            });

      if (response.error) throw response.error;

      if (authMode === 'signUp' && !response.data?.session) {
        setAuthNotice('Check your email to confirm your account.');
      } else {
        setAuthNotice('Signed in successfully.');
      }

      setAuthPassword('');
    } catch (err) {
      setAuthError(err?.message || 'Unable to authenticate.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    setAuthError('');
    setAuthNotice('');

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (err) {
      setAuthError(err?.message || 'Unable to sign out.');
    } finally {
      setAuthBusy(false);
    }
  };

  const openAuthView = () => {
    setActiveView('auth');
  };

  const openAccountView = () => {
    setActiveView('account');
  };

  const openMainView = () => {
    setActiveView('main');
  };

  return (
    <div className={`popcorn-shell${isOpen ? ' is-open' : ''}`}>
      <CorneliusToggle
        isOpen={isOpen}
        onToggle={onToggle}
        isVideoPlayer={isVideoPlayer}
      />
      <VideoEdgeToggle
        isOpen={isOpen}
        onToggle={onToggle}
        isVideoPlayer={isVideoPlayer}
      />

      <aside className="popcorn-sidebar" aria-hidden={!isOpen}>
        {activeView === 'auth' ? (
          <AuthPage
            session={authSession}
            status={authStatus}
            mode={authMode}
            email={authEmail}
            password={authPassword}
            isBusy={authBusy}
            error={authError}
            notice={authNotice}
            disabled={!isSupabaseConfigured}
            onBack={openMainView}
            onEmailChange={handleAuthEmailChange}
            onPasswordChange={handleAuthPasswordChange}
            onModeToggle={handleAuthModeToggle}
            onSubmit={handleAuthSubmit}
            onSignOut={handleSignOut}
          />
        ) : activeView === 'account' ? (
          <AccountPage
            session={authSession}
            status={authStatus}
            profile={profile}
            comments={accountComments}
            commentsStatus={accountCommentsStatus}
            commentsError={accountCommentsError}
            isBusy={authBusy}
            disabled={!isSupabaseConfigured}
            onBack={openMainView}
            onSignOut={handleSignOut}
          />
        ) : (
          <>
            {/* Title, provider, and summary metadata */}
            <header className="popcorn-header">
              <div>
                <div className="popcorn-brand">Popcorn!</div>
                <div className="popcorn-tagline">Give your hottest takes</div>
                <div className="popcorn-muted">Hi, {greetingName}</div>
              </div>
              <div className="popcorn-header-actions">
                <span className="popcorn-badge">
                  {providerLabel} {badgeLabel}
                </span>
                <button
                  className="popcorn-ghost popcorn-header-button"
                  type="button"
                  onClick={isAuthenticated ? openAccountView : openAuthView}
                  disabled={!isSupabaseConfigured}
                >
                  {isAuthenticated ? 'Account' : 'Sign in'}
                </button>
                {isOpen ? (
                  <button
                    className="popcorn-ghost popcorn-header-button"
                    type="button"
                    onClick={onToggle}
                  >
                    Close
                  </button>
                ) : null}
              </div>
            </header>

            {/* Primary content summary */}
            <section className="popcorn-hero">
              <div className="popcorn-hero-title-row">
                <div className="popcorn-hero-title">
                  <h2>{displayTitle}</h2>
                </div>
                <button
                  className={`popcorn-fix-link ${fixLinkTone}`}
                  type="button"
                  onClick={openFixModal}
                  disabled={!isReady || !catalogPlatformItemId}
                >
                  Wrong title?
                </button>
              </div>
              {metadataLine ? (
                <div className="popcorn-meta">{metadataLine}</div>
              ) : null}
              {displayOverview ? (
                <p className="popcorn-overview">{displayOverview}</p>
              ) : null}
              {status === 'ready' && comments.length === 0 && tmdbMatchSummary ? (
                <div className="popcorn-callout">
                  Whoops looks like you're the first one here! Did you want to make a
                  post about: {tmdbMatchSummary}
                </div>
              ) : null}
            </section>

            {isReady &&
            !mismatchDismissed &&
            (matchConfidence === 'low' || catalogStatus === 'missing') ? (
              <section className="popcorn-mismatch-banner">
                <div className="popcorn-mismatch-copy">
                  This might be misidentified. Help fix it?
                </div>
                <div className="popcorn-mismatch-actions">
                  <button
                    className="popcorn-ghost popcorn-mismatch-button"
                    type="button"
                    onClick={() => setMismatchDismissed(true)}
                  >
                    Looks right
                  </button>
                  <button
                    className="popcorn-submit popcorn-mismatch-button"
                    type="button"
                    onClick={openFixModal}
                  >
                    Fix
                  </button>
                </div>
              </section>
            ) : null}

            {isFixOpen ? (
              <div className="popcorn-modal" role="dialog" aria-modal="true">
                <div
                  className="popcorn-modal-scrim"
                  role="presentation"
                  onClick={closeFixModal}
                />
                <div className="popcorn-modal-card">
                  <div className="popcorn-modal-title">Fix content match</div>
                  <div className="popcorn-modal-helper">
                    Pick the correct title so comments land in the right place.
                  </div>
                  <div className="popcorn-modal-question">Which is correct?</div>
                  <input
                    className="popcorn-input popcorn-fix-search"
                    type="search"
                    placeholder={
                      isTmdbConfigured ? 'Search titles' : 'TMDB search disabled'
                    }
                    value={fixQuery}
                    onChange={(event) => setFixQuery(event.target.value)}
                    disabled={!isTmdbConfigured}
                  />
                  {fixStatus === 'loading' ? (
                    <div className="popcorn-muted">Searching...</div>
                  ) : null}
                  {fixError ? <div className="popcorn-error">{fixError}</div> : null}
                  <div className="popcorn-fix-list">
                    {fixCandidates.map((candidate) => {
                      const typeLabel =
                        candidate.mediaType === 'movie' ? 'Movie' : 'Series';
                      const badgeLabel = candidate.isCurrent
                        ? 'Current match'
                        : candidate.isSuggested
                        ? 'Suggested'
                        : '';
                      const showBadge = Boolean(badgeLabel);
                      return (
                        <button
                          key={candidate.key}
                          className={`popcorn-fix-candidate${
                            selectedFixKey === candidate.key ? ' is-selected' : ''
                          }`}
                          type="button"
                          onClick={() => setSelectedFixKey(candidate.key)}
                        >
                          {candidate.posterUrl ? (
                            <img
                              className="popcorn-fix-poster"
                              src={candidate.posterUrl}
                              alt=""
                              aria-hidden="true"
                            />
                          ) : (
                            <div className="popcorn-fix-poster placeholder" />
                          )}
                          <div className="popcorn-fix-meta">
                            <div className="popcorn-fix-title">
                              {candidate.title}
                              {candidate.year ? ` (${candidate.year})` : ''}
                            </div>
                            <div className="popcorn-fix-subtitle">
                              {typeLabel}
                              {candidate.network || candidate.studio
                                ? ` • ${candidate.network || candidate.studio}`
                                : ''}
                            </div>
                          </div>
                          {showBadge ? (
                            <span className="popcorn-fix-tag">{badgeLabel}</span>
                          ) : null}
                        </button>
                      );
                    })}
                    {fixStatus === 'ready' && fixCandidates.length === 0 ? (
                      <div className="popcorn-muted">No matches yet.</div>
                    ) : null}
                  </div>
                  <div className="popcorn-modal-actions">
                    <button
                      className="popcorn-ghost"
                      type="button"
                      onClick={closeFixModal}
                      disabled={isSavingMatch}
                    >
                      Cancel
                    </button>
                    <button
                      className="popcorn-submit"
                      type="button"
                      onClick={handleSaveMatch}
                      disabled={
                        isSavingMatch || !selectedFixKey || !isSupabaseConfigured
                      }
                    >
                      {isSavingMatch ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {toastMessage ? (
              <div className="popcorn-toast" role="status" aria-live="polite">
                {toastMessage}
              </div>
            ) : null}

        {/* Comment composer */}
        <section className="popcorn-compose">
          <div className="popcorn-section-title">Start the thread</div>
          <CommentBox
            onSubmit={handleSubmit}
            disabled={
              !isReady ||
              status === 'loading' ||
              !isSupabaseConfigured ||
              !isAuthenticated
            }
            placeholder={
              isAuthenticated
                ? 'Drop your take...'
                : 'Sign in to join the thread...'
            }
          />
          {!isAuthenticated && isSupabaseConfigured ? (
            <div className="popcorn-callout popcorn-auth-callout">
              <div>Sign in to post and vote on comments.</div>
              <button
                className="popcorn-submit popcorn-auth-cta"
                type="button"
                onClick={openAuthView}
              >
                Sign in
              </button>
            </div>
          ) : null}
          {connectionMessage ? (
            <div className="popcorn-callout">{connectionMessage}</div>
          ) : null}
          {tmdbMessage ? (
            <div className="popcorn-callout">{tmdbMessage}</div>
          ) : null}
        </section>

        {/* Comments list */}
        <section className="popcorn-comments">
          <div className="popcorn-section-title">Hot takes</div>
          {status === 'loading' ? (
            <div className="popcorn-muted">Loading comments...</div>
          ) : null}
          {status === 'error' ? (
            <div className="popcorn-error">{error}</div>
          ) : null}
          {status === 'ready' && comments.length === 0 ? (
            <div className="popcorn-muted">Be the first to comment.</div>
          ) : null}
          {comments.map((comment, index) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              index={index}
              onVote={handleVote}
              canVote={isAuthenticated}
            />
          ))}
        </section>
          </>
        )}
      </aside>
    </div>
  );
};

export default SidebarApp;
