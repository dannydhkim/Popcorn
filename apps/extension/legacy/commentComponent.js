import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';

function Comment({ comment, contentId }) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  return (
    <div style={{ marginLeft: comment.parentId ? 20 : 0 }}>
      <div>
        <strong>{comment.author}</strong>: {comment.content}
      </div>
      <button onClick={() => setShowReplyForm(!showReplyForm)}>Reply</button>
      {showReplyForm && <ReplyForm parentId={comment.id} contentId={contentId} />}
      {comment.children.map(child => (
        <Comment key={child.id} comment={child} contentId={contentId} />
      ))}
    </div>
  );
}

function ReplyForm({ parentId, contentId }) {
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    const payload = {
      content,
      parent_id: parentId,
      author: 'CurrentUser', // Replace with actual user data
      content_id: contentId,
    };

    const { error } = await supabase.from('comments').insert(payload);

    if (error) {
      console.error('Failed to submit reply:', error);
      return;
    }

    setContent('');
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Write your reply..."
      />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
