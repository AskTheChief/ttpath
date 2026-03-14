'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { ChatSessionSchema, type ChatSession } from '@/lib/types';
export type { ChatSession };

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const GetChatSessionsOutputSchema = z.array(ChatSessionSchema);

export async function getChatSessions(): Promise<ChatSession[]> {
  return getChatSessionsFlow();
}

const getChatSessionsFlow = ai.defineFlow(
  {
    name: 'getChatSessionsFlow',
    outputSchema: GetChatSessionsOutputSchema,
  },
  async () => {
    try {
      const sessionsSnapshot = await db.collection('chat_sessions').orderBy('createdAt', 'desc').get();
      
      const sessions = sessionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          question: data.question,
          answer: data.answer,
          createdAt: data.createdAt.toDate().toISOString(),
          userName: data.userName,
          userId: data.userId,
        };
      });
      return sessions;
    } catch (error) {
      console.error('Error getting chat sessions:', error);
      return [];
    }
  }
);
