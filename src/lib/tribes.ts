
import { db } from './firebase';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';

export const leaveTribe = async (tribeId: string, userId: string) => {
  const tribeRef = doc(db, 'tribes', tribeId);
  await updateDoc(tribeRef, {
    members: arrayRemove(userId),
  });
};
