
'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { createTribe, getTribes, joinTribe, leaveTribe, Tribe } from '@/lib/tribes';
import { getTutorialAnswers } from '@/lib/tutorial';
import { tutorialQuestions } from '@/lib/data';
import { saveTutorialAnswers } from '@/ai/flows/save-tutorial-answers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function MyTribePage() {
  const [user, setUser] = useState<User | null>(null);
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [newTribeName, setNewTribeName] = useState('');
  const [userTribe, setUserTribe] = useState<Tribe | null>(null);
  const [tutorialAnswers, setTutorialAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTribes = useCallback(async (userId: string) => {
    const allTribes = await getTribes();
    setTribes(allTribes);
    const currentUserTribe = allTribes.find(tribe => tribe.members.includes(userId));
    setUserTribe(currentUserTribe || null);
  }, []);

  const fetchTutorialAnswers = useCallback(async () => {
    try {
      const answers = await getTutorialAnswers({});
      setTutorialAnswers(answers);
    } catch (error) {
      console.error("Error fetching tutorial answers: ", error);
      toast({ title: 'Error', description: 'Could not load your tutorial answers.', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsLoading(true);
      if (currentUser) {
        await Promise.all([
          fetchTribes(currentUser.uid),
          fetchTutorialAnswers()
        ]);
      } else {
        setTribes([]);
        setUserTribe(null);
        setTutorialAnswers({});
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchTribes, fetchTutorialAnswers]);

  const handleCreateTribe = async () => {
    if (newTribeName.trim() === '' || !user) return;
    try {
      await createTribe(newTribeName, user.uid);
      toast({ title: 'Tribe Created', description: `Successfully created ${newTribeName}.` });
      setNewTribeName('');
      fetchTribes(user.uid);
    } catch (error) {
      console.error("Error creating tribe: ", error);
      toast({ title: 'Error', description: 'Failed to create tribe.', variant: 'destructive' });
    }
  };

  const handleJoinTribe = async (tribeId: string) => {
    if (!user) return;
    try {
      await joinTribe(tribeId, user.uid);
      toast({ title: 'Joined Tribe', description: 'You have successfully joined the tribe.' });
      fetchTribes(user.uid);
    } catch (error) {
      console.error("Error joining tribe: ", error);
      toast({ title: 'Error', description: 'Failed to join tribe.', variant: 'destructive' });
    }
  };

  const handleLeaveTribe = async (tribeId: string) => {
    if (!user) return;
    try {
      await leaveTribe(tribeId, user.uid);
      toast({ title: 'Left Tribe', description: 'You have successfully left the tribe.' });
      fetchTribes(user.uid);
    } catch (error) {
      console.error("Error leaving tribe: ", error);
      toast({ title: 'Error', description: 'Failed to leave tribe.', variant: 'destructive' });
    }
  };

  const handleAnswerChange = (question: string, value: string) => {
    setTutorialAnswers(prev => ({ ...prev, [question]: value }));
  };

  const handleSaveAnswers = async () => {
    setIsLoading(true);
    try {
      await saveTutorialAnswers({ answers: tutorialAnswers });
      toast({ title: 'Success', description: 'Your tutorial answers have been saved.' });
    } catch (error) {
      console.error("Error saving tutorial answers: ", error);
      toast({ title: 'Error', description: 'Failed to save your answers.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4">You must be logged in to view your tribe and tutorial answers.</p>
        <Link href="/" passHref>
          <Button>Back to Path</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Link href="/" passHref>
        <Button className="absolute top-4 left-4">Back to Path</Button>
      </Link>
      <h1 className="text-3xl font-bold text-center my-8">My Tribe</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          {userTribe ? (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Your Current Tribe: {userTribe.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Members: {userTribe.members.length}</p>
                <Button onClick={() => handleLeaveTribe(userTribe.id)} variant="destructive" className="mt-4">Leave Tribe</Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Create a New Tribe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newTribeName}
                    onChange={(e) => setNewTribeName(e.target.value)}
                    placeholder="Enter tribe name"
                  />
                  <Button onClick={handleCreateTribe}>Create Tribe</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Available Tribes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tribes.map((tribe) => (
                  <div key={tribe.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{tribe.name}</h3>
                      <p className="text-sm text-muted-foreground">Members: {tribe.members.length}</p>
                    </div>
                    {!userTribe && (
                      <Button onClick={() => handleJoinTribe(tribe.id)}>Join</Button>
                    )}
                  </div>
                ))}
                {tribes.length === 0 && <p>No tribes available to join right now.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Living Tutorial</CardTitle>
            <CardDescription>Review and edit your answers. Your progress saves automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {tutorialQuestions.map((q, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                   <AccordionTrigger>{i + 1}. {q}</AccordionTrigger>
                   <AccordionContent>
                      <Textarea
                        rows={5}
                        value={tutorialAnswers[q] || ''}
                        onChange={(e) => handleAnswerChange(q, e.target.value)}
                        placeholder="Your answer..."
                        disabled={isLoading}
                      />
                   </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveAnswers} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Answers'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
