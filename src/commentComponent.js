import React, { useState } from 'react';

function Comment({ comment }) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  return (
    <div style={{ marginLeft: comment.parentId ? 20 : 0 }}>
      <div>
        <strong>{comment.author}</strong>: {comment.content}
      </div>
      <button onClick={() => setShowReplyForm(!showReplyForm)}>Reply</button>
      {showReplyForm && <ReplyForm parentId={comment.id} />}
      {comment.children.map(child => (
        <Comment key={child.id} comment={child} />
      ))}
    </div>
  );
}

function ReplyForm({ parentId }) {
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    await firestore.collection('comments').add({
      content,
      parentId,
      author: 'CurrentUser', // Replace with actual user data
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });
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