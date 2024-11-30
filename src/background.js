import { db } from './firebaseConfig.js';
import { getFirestore, getDocs, collection, where, query } from 'firebase/firestore';
import React, { useState, useRef, useEffect } from 'react';

chrome.runtime.onInstalled.addListener(() => {
    console.log('Firebase initialized in background script.');
  });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
if (message.action === 'getData') {
    console.log("getting data from Firestore")
    getDataFromFirestore(db, message.videoId).then((data) => {
      console.log("received data", data)
      sendResponse({ data });
    });
    return true;
}
});

async function getDataFromFirestore(db, query_val) {
  const contentsCol = collection(db, 'contents');
  const w = query(contentsCol, where("videoID", "==", query_val));
  const idSnapshot = await getDocs(w);
  idSnapshot.forEach((doc) => {
    console.log(doc.id, " => ", doc.data());
  })
  const contentList = idSnapshot.docs.map(doc => doc.data())

  return contentList;
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