import React from 'react';
import useComments from 'comment'
import Comment from 'commentComponent'

function Sidebar() {
  const comments = useComments();
  const nestedComments = buildCommentTree(comments);

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <p>Sidebar content</p>
      {/* {nestedComments.map(comment => (
        <Comment key={comment.id} comment={comment} />
      ))} */}
    </div>
  );
}

export default Sidebar;