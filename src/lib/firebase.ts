import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  projectId: 'genkit-fb-demo-48-d7b86',
  appId: '1:331286755868:web:b12513f1c52d83774d3dd9',
  storageBucket: 'genkit-fb-demo-48-d7b86.appspot.com',
  apiKey: 'AIzaSyCaxC37y2gD0b4F_pT1S2Y_w-3zr9X9v9E',
  authDomain: 'genkit-fb-demo-48-d7b86.firebaseapp.com',
  messagingSenderId: '331286755868',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
