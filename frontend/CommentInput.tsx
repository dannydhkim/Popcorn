// src/components/CommentInput.tsx
import React, { useState } from 'react';

interface CommentInputProps {
  onSubmit: (content: string) => void;
}

const CommentInput: React.FC<CommentInputProps> = ({ onSubmit }) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content);
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment (you can include image URLs)..."
        rows={4}
        cols={50}
      />
      <button type="submit">Post Comment</button>
    </form>
  );
};

export default CommentInput;
