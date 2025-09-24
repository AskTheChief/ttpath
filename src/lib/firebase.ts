import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBpw8RSF3xX-a6xoJrcPmpJI9ExFMyeJuc",
  authDomain: "studio-7790315517-f3fe6.firebaseapp.com",
  projectId: "studio-7790315517-f3fe6",
  storageBucket: "studio-7790315517-f3fe6.firebasestorage.app",
  messagingSenderId: "193775147768",
  appId: "1:193775147768:web:83072dbfcedbf0601ff90d",
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// The getFirestore function will automatically use the default database
export const db = getFirestore(app);
export const auth = getAuth(app);
