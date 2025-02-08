import { db } from './firebaseConfig';
import { getFirestore, getDocs, collection } from 'firebase/firestore';

chrome.runtime.onInstalled.addListener(() => {
    console.log('Firebase initialized in background script.');
  });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
if (message.action === 'getData') {
    console.log("getting data from Firestore")
    getDataFromFirestore(db).then((data) => {
      console.log("received data", data)
      sendResponse({ data });
    });
    return true;
}
});

async function getDataFromFirestore(db) {
  const contentsCol = collection(db, 'contents');
  const contentSnapshot = await getDocs(contentsCol);
  const contentList = contentSnapshot.docs.map(doc => doc.data());
  return contentList;
  }