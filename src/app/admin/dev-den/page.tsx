
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getChatSessions, type ChatSession } from '@/ai/flows/get-chat-sessions';
import UserTable from '@/components/admin/user-table';

export default function DevDenPage() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChatSessions() {
      try {
        const sessions = await getChatSessions();
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
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>User Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <UserTable />
        </CardContent>
      </Card>
      
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
                  <AccordionTrigger>
                    <div className="flex flex-col text-left">
                       <span>{session.question}</span>
                       <span className="text-xs text-muted-foreground">
                         - {session.userName || 'Anonymous'} ({new Date(session.createdAt).toLocaleDateString()})
                       </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="whitespace-pre-wrap">{session.answer}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {new Date(session.createdAt).toLocaleString()}
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
