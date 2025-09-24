
'use client';

import { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const db = getFirestore(app);

interface ChatSession {
  id: string;
  question: string;
  answer: string;
  createdAt: Date;
}

export default function DevDenPage() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChatSessions() {
      try {
        const q = query(collection(db, 'chat_sessions'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const sessions = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            question: data.question,
            answer: data.answer,
            createdAt: data.createdAt.toDate(),
          };
        });
        setChatSessions(sessions);
      } catch (error) {
        console.error("Error fetching chat sessions: ", error);
      } finally {
        setLoading(false);
      }
    }

    fetchChatSessions();
  }, []);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Chief Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {chatSessions.map(session => (
                <AccordionItem key={session.id} value={session.id}>
                  <AccordionTrigger>{session.question}</AccordionTrigger>
                  <AccordionContent>
                    <p className="whitespace-pre-wrap">{session.answer}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {session.createdAt.toLocaleString()}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
