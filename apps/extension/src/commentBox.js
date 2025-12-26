import React, { useState } from 'react';

const CommentBox = ({ onSubmit, disabled, placeholder = 'Drop your take...' }) => {
  const [value, setValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    setIsSending(true);
    setError('');

    try {
      await onSubmit(trimmed);
      setValue('');
    } catch (err) {
      setError('Comment failed to send.');
    } finally {
      setIsSending(false);
    }
  };

  return (
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
