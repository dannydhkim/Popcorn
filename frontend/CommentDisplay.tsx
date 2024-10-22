// src/components/CommentDisplay.tsx
import React from 'react';
import DOMPurify from 'dompurify';
// Add the following import at the top
import { parseContent } from '../utils/parseContent';


interface Comment {
  id: string;
  content: string;
  timestamp: Date;
  userId: string;
}

interface CommentDisplayProps {
  comment: Comment;
}

const CommentDisplay: React.FC<CommentDisplayProps> = ({ comment }) => {
  const renderContent = () => {
    // Sanitize and parse content
    const sanitizedContent = DOMPurify.sanitize(comment.content);
    const contentWithImages = parseContent(sanitizedContent);

    return <div dangerouslySetInnerHTML={{ __html: contentWithImages }} />;
  };

  return (
    <div className="comment">
      <div className="comment-meta">
        <span>User: {comment.userId}</span>
        <span>Date: {comment.timestamp.toLocaleString()}</span>
      </div>
      <div className="comment-content">{renderContent()}</div>
    </div>
  );
};

export default CommentDisplay;
