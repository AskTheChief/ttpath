
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, FileQuestion, Sparkles } from 'lucide-react';
import { getAllTutorialAnswers, type UserAnswers } from '@/ai/flows/get-all-tutorial-answers';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { tutorialQuestions } from '@/lib/data';

export default function TutorialAnswersPage() {
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


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tutorial Answers</h1>
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion />
            Comprehension Test Submissions
          </CardTitle>
          <CardDescription>Review all user submissions for the comprehension test.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <p>Loading answers...</p>
            ) : userAnswers.length === 0 ? (
                <p>No tutorial answers found.</p>
            ) : (
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
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold mb-2">Answers</h4>
                                <div className="space-y-4 pl-4 border-l-2">
                                {tutorialQuestions.map((question, index) => (
                                    <div key={question}>
                                    <p className="font-semibold">{`${index + 1}. ${question}`}</p>
                                    <p className="text-muted-foreground whitespace-pre-wrap pl-2">
                                        {user.answers[question] || 'No answer provided.'}
                                    </p>
                                    </div>
                                ))}
                                {Object.keys(user.answers).length === 0 && (
                                    <p className="text-muted-foreground">This user has not submitted any answers.</p>
                                )}
                                </div>
                            </div>
                            {user.latestFeedback && (
                                <div>
                                    <h4 className="font-semibold mb-2">Most Recent Feedback</h4>
                                    <Alert>
                                        <Sparkles className="h-4 w-4" />
                                        <AlertTitle>
                                            Guidance from The Chief
                                        </AlertTitle>
                                        <AlertDescription>
                                            <p className="whitespace-pre-wrap">{user.latestFeedback.feedback}</p>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {new Date(user.latestFeedback.createdAt).toLocaleString()}
                                            </p>
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}
                        </div>
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
