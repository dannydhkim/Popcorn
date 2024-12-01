import { db } from './firebaseConfig.js';
import { getFirestore, getDocs, collection, where, query } from 'firebase/firestore';
import React, { useState, useRef, useEffect } from 'react';

chrome.runtime.onInstalled.addListener(() => {
    console.log('Firebase initialized in background script.');
  });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
if (message.action === 'getData') {
    console.log("getting data from Firestore")
    getCommentsFromFirestore(db, message.videoId).then((data) => {
      console.log("received data", data)
      sendResponse({ data });
    });
    return true;
}
});

async function getCommentsFromFirestore(db, query_val) {
  const docSnapshot = await getDataFromFirestore(db, query_val)

  if (docSnapshot.empty) {
    console.log("No matching documents found.");
    return [];
  }
  const firstDocRef = docSnapshot.docs[0].ref
  const commentsCollectionRef = collection(firstDocRef, 'comments')

  const commentsSnapshot = await getDocs(commentsCollectionRef)

  const comments = commentsSnapshot.docs.map(doc => ({
    author: doc.author,
    comment: doc.content,
    ...doc.data()
  }));

  return comments

}

async function getDataFromFirestore(db, query_val) {
  const contentsCol = collection(db, 'contents');  
  const q = query(contentsCol, where("netflixUrl", "==", query_val));
  const qidSnapshot = await getDocs(q);

  const qcontentList = qidSnapshot.docs.map(doc => doc.data())

  return qidSnapshot
  }


function useComments() {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const unsubscribe = firestore.collection('contents')
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

// console.log(useComments());
// console.log(buildCommentTree());