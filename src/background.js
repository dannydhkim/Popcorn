import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, getDocs, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyArYGJ_EroSJQiatwVfe_b6wj9dq92bsVo",
  authDomain: "popcorn-extension.firebaseapp.com",
  databaseURL: "https://popcorn-extension-default-rtdb.firebaseio.com",
  projectId: "popcorn-extension",
  storageBucket: "popcorn-extension.appspot.com",
  messagingSenderId: "749577531238",
  appId: "1:749577531238:web:4ac8c2f99d985cfb21a2a7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

chrome.runtime.onInstalled.addListener(() => {
    console.log('Firebase initialized in background script.');
  });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
if (message.action === 'getData') {
    // Fetch data from Firestore
    // getDataFromFirestore()
    // sendResponse(data)
    console.log("getting data from Firestore")
    getDataFromFirestore().then((data) => {
      console.log("received data", data)
      sendResponse({ data });
    });
    // Return true to indicate asynchronous response
    return true;
}
});

async function getDataFromFirestore(db) {
  const contentsCol = collection(db, 'contents');
  const contentSnapshot = awaitgetDocs(contentsCol);
  const contentList = contentSnapshot.docs.map(doc => doc.data());
  return contentList;
    // const querySnapshot = await getDocs(collection(db, 'contents'));
    // const data = [];
    // querySnapshot.forEach((doc) => {
    //   data.push(doc.data());
    // });
    // return data;
  }

export { auth, db };