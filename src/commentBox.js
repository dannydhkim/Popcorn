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
    <form className="flex flex-col mr-5 space-y-2" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        value={comment}
        onChange={handleChange}
        placeholder="Write a comment..."
        className="w-full text-2xl text-black resize-none overflow-hidden p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        onSubmit={handleSubmit}
        className="self-end text-lg px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Post
      </button>
    </form>
  );
};

export default CommentBox;
