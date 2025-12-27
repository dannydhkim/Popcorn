import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import CommentBox from './commentBox';
import { getProviderLabel } from './contentSources';
import {
  confirmContentMapping,
  createComment,
  ensureThread,
  fetchComments,
  fetchContentCatalog,
  getViewerId,
  isSupabaseConfigured,
  updateCommentScore,
  upsertContentCatalogFromTmdb
} from './supabaseClient';
import { isTmdbConfigured } from './tmdb';

const PLAY_BUTTON_SELECTORS = [
  'a.primary-button.playLink',
  'button[data-testid="play-button"]',
  'button[aria-label="Play"]',
  'button[aria-label*="Play"]',
  '[data-uia="play-button"]'
];

const findPlayButton = () => {
  for (const selector of PLAY_BUTTON_SELECTORS) {
    const match = document.querySelector(selector);
    if (match) return match;
  }
  return null;
};

const CorneliusToggle = ({ isOpen, onToggle }) => {
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    if (!document.body) return undefined;
    let mounted = true;
    let currentPortal = null;

    const ensurePortal = () => {
      const target = findPlayButton();
      if (!target?.parentElement) return;

      let portal = target.parentElement.querySelector('.cornelius-portal');
      if (!portal) {
        portal = document.createElement('div');
        portal.className = 'cornelius-portal';
        target.parentElement.insertBefore(portal, target.nextSibling);
      }

      if (mounted && portal !== currentPortal) {
        currentPortal = portal;
        setPortalTarget(portal);
      }
    };

    const observer = new MutationObserver(ensurePortal);
    observer.observe(document.body, { childList: true, subtree: true });
    ensurePortal();

    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, []);

  if (!portalTarget) return null;
  const iconUrl = chrome.runtime.getURL('cornelius.svg');

  return createPortal(
    <button
      className={`popcorn-cornelius-button${isOpen ? ' is-open' : ''}`}
      type="button"
      onClick={onToggle}
      aria-pressed={isOpen}
      aria-label="Toggle Popcorn sidebar"
    >
      <img className="popcorn-cornelius-icon" src={iconUrl} alt="Popcorn" />
    </button>,
    portalTarget
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
const CommentRow = ({ comment, index, onVote }) => {
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
          aria-label="Upvote"
        >
          ^
        </button>
        <div className="popcorn-score">{score}</div>
        <button
          className="popcorn-vote-button"
          type="button"
          onClick={() => onVote(comment, score - 1)}
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

// Main sidebar UI driven by current content and Supabase data.
const SidebarApp = ({ content, isOpen, onToggle }) => {
  // Thread + comments.
  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  // Catalog metadata (content_catalog + mapping) state.
  const [catalogEntry, setCatalogEntry] = useState(null);
  const [catalogStatus, setCatalogStatus] = useState('idle');
  const [catalogError, setCatalogError] = useState('');
  const [catalogDismissed, setCatalogDismissed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Content readiness and labels for the header.
  const isReady = Boolean(content && content.key);
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
  const tmdbLink =
    catalogEntry?.tmdb_metadata?.tmdbUrl || content?.tmdb?.tmdbUrl || '';

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

  // Load catalog metadata for this provider id.
  useEffect(() => {
    let isActive = true;

    if (!isReady || !isSupabaseConfigured || !content?.providerId) {
      setCatalogEntry(null);
      setCatalogStatus('idle');
      setCatalogError('');
      setCatalogDismissed(false);
      return () => {
        isActive = false;
      };
    }

    setCatalogStatus('loading');
    setCatalogError('');
    setCatalogEntry(null);
    setCatalogDismissed(false);

    fetchContentCatalog({
      provider: content.provider,
      providerId: content.providerId
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
        setCatalogError('Unable to load catalog metadata.');
      });

    return () => {
      isActive = false;
    };
  }, [content?.provider, content?.providerId, isReady, isSupabaseConfigured]);

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
          contentProviderId: content.providerId,
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

  // Show the TMDB confirmation UI only when catalog data is missing.
  const candidateAvailable =
    catalogStatus === 'missing' && Boolean(content?.tmdb) && !catalogDismissed;

  // Persist the chosen TMDB match into the catalog + mapping tables.
  const handleConfirmCandidate = async () => {
    if (!content?.tmdb || !content?.provider || !content?.providerId) return;

    setIsConfirming(true);
    setCatalogError('');

    try {
      const catalog = await upsertContentCatalogFromTmdb(content.tmdb);
      if (!catalog) {
        setCatalogError('Catalog tables are missing. Apply supabase/schema.sql.');
        return;
      }

      const mapping = await confirmContentMapping({
        provider: content.provider,
        providerId: content.providerId,
        contentCatalogId: catalog.id,
        viewerId: getViewerId(),
        tmdbMetadata: content.tmdb
      });

      if (!mapping) {
        setCatalogError('Catalog tables are missing. Apply supabase/schema.sql.');
        return;
      }

      setCatalogEntry(catalog);
      setCatalogStatus('ready');
      setCatalogDismissed(true);
    } catch (err) {
      setCatalogError('Unable to save catalog metadata.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Create a new comment and prepend it in the UI.
  const handleSubmit = async (text) => {
    if (!thread) return;
    const nextComment = await createComment({
      threadId: thread.id,
      body: text
    });
    setComments((prev) => [nextComment, ...prev]);
  };

  // Optimistically update the vote UI and roll back on error.
  const handleVote = async (comment, nextScore) => {
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

  return (
    <div className="popcorn-shell">
      <CorneliusToggle isOpen={isOpen} onToggle={onToggle} />

      <aside className="popcorn-sidebar" aria-hidden={!isOpen}>
        {/* Title, provider, and summary metadata */}
        <header className="popcorn-header">
          <div>
            <div className="popcorn-brand">Popcorn</div>
            <div className="popcorn-tagline">Live takes per title</div>
          </div>
          <span className="popcorn-badge">
            {providerLabel} {badgeLabel}
          </span>
        </header>

        {/* Primary content summary */}
        <section className="popcorn-hero">
          <h2>{displayTitle}</h2>
          {metadataLine ? (
            <div className="popcorn-meta">{metadataLine}</div>
          ) : null}
          {displayOverview ? (
            <p className="popcorn-overview">{displayOverview}</p>
          ) : null}
          {content?.url ? (
            <a
              className="popcorn-link"
              href={content.url}
              target="_blank"
              rel="noreferrer"
            >
              {content.url}
            </a>
          ) : (
            <p className="popcorn-muted">
              Open a preview or title page to load a thread.
            </p>
          )}
          {content?.providerId ? (
            <div className="popcorn-meta">
              Provider ID: {content.provider}:{content.providerId}
            </div>
          ) : null}
          {content?.tmdb?.id ? (
            <div className="popcorn-meta">
              TMDB: {content.tmdb.mediaType} #{content.tmdb.id}
            </div>
          ) : null}
          {catalogEntry?.id ? (
            <div className="popcorn-meta">Catalog: {catalogEntry.id}</div>
          ) : null}
        </section>

        {/* Optional TMDB confirmation prompt */}
        {candidateAvailable ? (
          <section className="popcorn-candidate">
            <div className="popcorn-section-title">
              Confirm TMDB match
            </div>
            <div className="popcorn-candidate-body">
              <div className="popcorn-candidate-title">
                {content.tmdb.title}
              </div>
              {content.tmdb.originalTitle ? (
                <div className="popcorn-candidate-subtitle">
                  Original: {content.tmdb.originalTitle}
                </div>
              ) : null}
              {content.tmdb.year ? (
                <div className="popcorn-candidate-detail">
                  Year: {content.tmdb.year}
                </div>
              ) : null}
              {content.tmdb.genres?.length ? (
                <div className="popcorn-candidate-detail">
                  Genres: {content.tmdb.genres.join(', ')}
                </div>
              ) : null}
              {Number.isFinite(content.tmdb.rating) ? (
                <div className="popcorn-candidate-detail">
                  Rating: {content.tmdb.rating.toFixed(1)} / 10 ({content.tmdb.voteCount || 0} votes)
                </div>
              ) : null}
              {content.tmdb.overview ? (
                <div className="popcorn-candidate-detail">
                  Overview: {content.tmdb.overview}
                </div>
              ) : null}
              {tmdbLink ? (
                <a
                  className="popcorn-link"
                  href={tmdbLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on TMDB
                </a>
              ) : null}
            </div>
            <div className="popcorn-candidate-actions">
              <button
                className="popcorn-submit"
                type="button"
                onClick={handleConfirmCandidate}
                disabled={isConfirming}
              >
                {isConfirming ? 'Saving...' : 'Confirm match'}
              </button>
              <button
                className="popcorn-ghost"
                type="button"
                onClick={() => setCatalogDismissed(true)}
                disabled={isConfirming}
              >
                Not this
              </button>
            </div>
            {catalogError ? (
              <div className="popcorn-error">{catalogError}</div>
            ) : null}
          </section>
        ) : null}

        {/* Comment composer */}
        <section className="popcorn-compose">
          <div className="popcorn-section-title">Start the thread</div>
          <CommentBox
            onSubmit={handleSubmit}
            disabled={!isReady || status === 'loading' || !isSupabaseConfigured}
          />
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
            />
          ))}
        </section>
      </aside>
    </div>
  );
};

export default SidebarApp;
