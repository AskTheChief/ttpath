
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const ChatSessionSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  createdAt: z.string(),
  userName: z.string().optional(),
  userId: z.string().optional(),
});
export type ChatSession = z.infer<typeof ChatSessionSchema>;

const GetChatSessionsOutputSchema = z.array(ChatSessionSchema);
export type GetChatSessionsOutput = z.infer<typeof GetChatSessionsOutputSchema>;

export async function getChatSessions(): Promise<GetChatSessionsOutput> {
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
