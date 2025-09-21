"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Feedback = {
  id: string;
  email?: string;
  feedback: string;
  createdAt: Date;
};

type ChatSession = {
  id: string;
  question: string;
  answer: string;
  createdAt: Date;
};

type AdminModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          if (!db) {
             setError("Firestore is not initialized. Please check your Firebase config.");
             setIsLoading(false);
             return;
          }
          // Fetch Feedback
          const feedbackQuery = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
          const feedbackSnapshot = await getDocs(feedbackQuery);
          const feedbackData = feedbackSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate(),
          })) as Feedback[];
          setFeedback(feedbackData);

          // Fetch Chat Sessions
          const chatQuery = query(collection(db, "chat_sessions"), orderBy("createdAt", "desc"));
          const chatSnapshot = await getDocs(chatQuery);
          const chatData = chatSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate(),
          })) as ChatSession[];
          setChatSessions(chatData);

        } catch (err: any) {
          console.error("Error fetching admin data:", err);
          setError(`Failed to load data: ${err.message}. Ensure the database ID in your Firebase config is correct and the database exists.`);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Admin's Corner</DialogTitle>
          <DialogDescription>
            View user feedback and chat logs.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0">
          {isLoading && <p>Loading...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!isLoading && !error && (
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="feedback">
                <AccordionTrigger>User Feedback ({feedback.length})</AccordionTrigger>
                <AccordionContent>
                  {feedback.length > 0 ? (
                    <ul className="space-y-4">
                      {feedback.map(item => (
                        <li key={item.id} className="p-4 bg-gray-50 rounded-md">
                          <p className="font-semibold">{item.email || 'Anonymous'}</p>
                          <p className="text-sm text-gray-600 mb-2">{item.createdAt.toLocaleString()}</p>
                          <p>{item.feedback}</p>
                        </li>
                      ))}
                    </ul>
                  ) : <p>No feedback submitted yet.</p>}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="chat-logs">
                <AccordionTrigger>Chat Logs ({chatSessions.length})</AccordionTrigger>
                <AccordionContent>
                {chatSessions.length > 0 ? (
                    <ul className="space-y-4">
                      {chatSessions.map(item => (
                        <li key={item.id} className="p-4 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-600 mb-2">{item.createdAt.toLocaleString()}</p>
                          <p><span className="font-semibold">User:</span> {item.question}</p>
                          <p><span className="font-semibold">Chief:</span> {item.answer}</p>
                        </li>
                      ))}
                    </ul>
                  ) : <p>No chat logs found.</p>}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
