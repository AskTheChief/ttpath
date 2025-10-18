
'use client';

import { useState, useEffect } from 'react';
import { getAllTutorialAnswers, type UserAnswers } from '@/ai/flows/get-all-tutorial-answers';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function TutorialAnswersViewer() {
  const [userAnswers, setUserAnswers] = useState<UserAnswers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnswers() {
      try {
        const answers = await getAllTutorialAnswers();
        setUserAnswers(answers);
      } catch (error) {
        console.error('Error fetching tutorial answers:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAnswers();
  }, []);

  if (loading) {
    return <p>Loading answers...</p>;
  }

  if (userAnswers.length === 0) {
    return <p>No tutorial answers found.</p>;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {userAnswers.map((user) => (
        <AccordionItem key={user.userId} value={user.userId}>
          <AccordionTrigger>
            <div className="flex flex-col items-start text-left">
              <span className="font-medium">{user.userName}</span>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {Object.entries(user.answers).map(([question, answer]) => (
                <div key={question}>
                  <p className="font-semibold">{question}</p>
                  <p className="text-muted-foreground whitespace-pre-wrap pl-2 border-l-2">
                    {answer || 'No answer provided.'}
                  </p>
                </div>
              ))}
              {Object.keys(user.answers).length === 0 && (
                <p className="text-muted-foreground">This user has not submitted any answers.</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
