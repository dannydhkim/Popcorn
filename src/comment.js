import { useEffect, useState } from 'react';
import { firestore } from './firebaseConfig'; // Your Firebase setup

function useComments() {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const unsubscribe = firestore.collection('comments')
      .orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
        const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setComments(commentsData);
      });

    return () => unsubscribe();
  }, []);

  return comments;
}

function buildCommentTree(comments) {
    const commentMap = {};
    comments.forEach(comment => {
      comment.children = [];
      commentMap[comment.id] = comment;
    });
  
    const rootComments = [];
  
    comments.forEach(comment => {
      if (comment.parentId) {
        const parent = commentMap[comment.parentId];
        if (parent) {
          parent.children.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });
  
    return rootComments;
  }