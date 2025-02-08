import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

export { auth, db };