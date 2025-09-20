import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  projectId: 'studio-6480601212-d7b86',
  appId: '1:331286755868:web:325def898ee882004d3dd9',
  storageBucket: 'studio-6480601212-d7b86.firebasestorage.app',
  apiKey: 'AIzaSyBhEp8RlUJWXoNgN4vsGqxDkJNpdbZ3duE',
  authDomain: 'studio-6480601212-d7b86.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '331286755868',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
