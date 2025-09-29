
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export interface Tribe {
  id: string;
  name: string;
  members: string[];
}

export const createTribe = async (tribeName: string, creatorId: string) => {
  const newTribeRef = await addDoc(collection(db, 'tribes'), {
    name: tribeName,
    members: [creatorId],
  });
  return newTribeRef.id;
};

export const getTribes = async () => {
  const tribesCollection = collection(db, 'tribes');
  const tribeSnapshot = await getDocs(tribesCollection);
  const tribeList = tribeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tribe));
  return tribeList;
};

export const joinTribe = async (tribeId: string, userId: string) => {
  const tribeRef = doc(db, 'tribes', tribeId);
  await updateDoc(tribeRef, {
    members: arrayUnion(userId),
  });
};

export const leaveTribe = async (tribeId: string, userId: string) => {
  const tribeRef = doc(db, 'tribes', tribeId);
  await updateDoc(tribeRef, {
    members: arrayRemove(userId),
  });
};
