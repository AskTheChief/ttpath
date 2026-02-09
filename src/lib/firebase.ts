import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "ttpath.com",
  projectId: "studio-7790315517-f3fe6",
  storageBucket: "studio-7790315517-f3fe6.appspot.com",
  messagingSenderId: "193775147768",
  appId: "1:193775147768:web:fd098f2c97c495de1ff90d",
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// The getFirestore function will automatically use the default database
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
