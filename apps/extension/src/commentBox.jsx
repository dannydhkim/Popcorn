import React, { useState } from 'react';

// Simple composer for posting a single comment into the thread.
const CommentBox = ({ onSubmit, disabled, placeholder = 'Drop your take...' }) => {
  // Local form state: content, request flag, and inline error text.
  const [value, setValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    // Keep the form from navigating and validate before sending.
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    // Optimistically flip the UI into a sending state.
    setIsSending(true);
    setError('');

    try {
      // Delegate persistence to the parent component.
      await onSubmit(trimmed);
      // Clear the textarea after a successful post.
      setValue('');
    } catch (err) {
      // Surface a small error without throwing in the UI.
      setError('Comment failed to send.');
    } finally {
      // Always reset the sending flag.
      setIsSending(false);
    }
  };

  return (
    // Keep the UI minimal: textarea + submit action.
    <form className="popcorn-composer" onSubmit={handleSubmit}>
      <textarea
        className="popcorn-textarea"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled || isSending}
      />
      {error ? <div className="popcorn-error">{error}</div> : null}
      <div className="popcorn-composer-actions">
        <button
          className="popcorn-submit"
          type="submit"
          disabled={disabled || isSending || !value.trim()}
        >
          {isSending ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
};

export default CommentBox;
