import React, { useState, useRef, useEffect } from 'react';

const CommentBox = () => {
  const [comment, setComment] = useState('');
  const textareaRef = useRef(null);

  // Adjust the textarea height based on content
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height to auto
      textarea.style.height = `${textarea.scrollHeight}px`; // Set height to scrollHeight
    }
  };

  // Handle textarea value change
  const handleChange = (e) => {
    setComment(e.target.value);
    adjustHeight();
  };

  // Adjust height on component mount and when comment changes
  useEffect(() => {
    adjustHeight();
  }, [comment]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle comment submission logic here
    console.log('Comment submitted:', comment);
    setComment('');
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        value={comment}
        onChange={handleChange}
        placeholder="Write a comment..."
        style={{
          width: '100%',
          resize: 'none',
          overflow: 'hidden',
          boxSizing: 'border-box',
      }}
      />
      <button type="submit" className="comment-submit-button">
        Post
      </button>
    </form>
  );
};

export default CommentBox;