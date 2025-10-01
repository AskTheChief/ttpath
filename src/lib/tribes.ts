
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export interface Tribe {
  id: string;
  name: string;
  location?: string;
  lat?: number;
  lng?: number;
  members: string[];
}

export const leaveTribe = async (tribeId: string, userId: string) => {
  const tribeRef = doc(db, 'tribes', tribeId);
  await updateDoc(tribeRef, {
    members: arrayRemove(userId),
  });
};
