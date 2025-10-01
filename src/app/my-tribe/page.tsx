
'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { leaveTribe } from '@/lib/tribes';
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
import { getTutorialFeedback, TutorialFeedback } from '@/ai/flows/get-tutorial-feedback';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { createTribe } from '@/ai/flows/create-tribe';
import { joinTribe } from '@/ai/flows/join-tribe';
import { getTribes } from '@/ai/flows/get-tribes';
import { useLoadScript, Libraries, GoogleMap, MarkerF } from '@react-google-maps/api';
import LocationAutocomplete from '@/components/location-autocomplete';
import type { Tribe } from '@/lib/types';

const libraries: Libraries = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '0.5rem',
};

const defaultCenter = {
    lat: 39.8283,
    lng: -98.5795,
};

export default function MyTribePage() {
  const [user, setUser] = useState<User | null>(null);
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [newTribeName, setNewTribeName] = useState('');
  const [newTribeLocation, setNewTribeLocation] = useState('');
  const [newTribeCoords, setNewTribeCoords] = useState<{lat: number; lng: number} | null>(null);
  const [userTribe, setUserTribe] = useState<Tribe | null>(null);
  const [tutorialAnswers, setTutorialAnswers] = useState<Record<string, string>>({});
  const [tutorialFeedback, setTutorialFeedback] = useState<Omit<TutorialFeedback, 'passed'>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const fetchTribesAndUserData = useCallback(async (currentUser: User) => {
    try {
      const [allTribes, answers, feedback] = await Promise.all([
        getTribes({}),
        getTutorialAnswers(),
        getTutorialFeedback(),
      ]);

      const tribesWithMembers = allTribes.map(t => ({...t, members: t.members || []}));
      setTribes(tribesWithMembers as Tribe[]);
      const currentUserTribe = (tribesWithMembers as Tribe[]).find(tribe => tribe.members.includes(currentUser.uid));
      setUserTribe(currentUserTribe || null);
      setTutorialAnswers(answers);
      setTutorialFeedback(feedback);

    } catch (error) {
        console.error("Error fetching page data: ", error);
        toast({ title: 'Error', description: 'Could not load your tribe and tutorial data.', variant: 'destructive' });
    }
  }, [toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);
      setUser(currentUser);
      if (currentUser) {
        await fetchTribesAndUserData(currentUser);
      } else {
        // Clear all data if user logs out
        setTribes([]);
        setUserTribe(null);
        setTutorialAnswers({});
        setTutorialFeedback([]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchTribesAndUserData]);

  const handleCreateTribe = async () => {
    if (!newTribeName.trim() || !newTribeLocation.trim() || !newTribeCoords) {
        toast({ title: 'Error', description: 'Please provide a valid name and select a location from the dropdown.', variant: 'destructive' });
        return;
    }
    if (!user) {
        toast({ title: 'Authentication Error', description: 'You must be logged in to create a tribe.', variant: 'destructive' });
        return;
    }

    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const result = await createTribe({ 
        name: newTribeName, 
        location: newTribeLocation,
        lat: newTribeCoords.lat,
        lng: newTribeCoords.lng,
        idToken: idToken,
      });
      if (result.success) {
        toast({ title: 'Tribe Created', description: `Successfully created ${newTribeName}.` });
        setNewTribeName('');
        setNewTribeLocation('');
        setNewTribeCoords(null);
        if (user) fetchTribesAndUserData(user);
      } else {
        throw new Error('Failed to create tribe.');
      }
    } catch (error: any) {
      console.error("Error creating tribe: ", error);
      toast({ title: 'Error', description: error.message || 'Failed to create tribe.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleJoinTribe = async (tribeId: string) => {
    if (!user) return;
    try {
      await joinTribe({ tribeId });
      toast({ title: 'Application Sent', description: 'Your request to join has been sent to the Tribe Chief.' });
      if (user) fetchTribesAndUserData(user);
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
      if (user) fetchTribesAndUserData(user);
    } catch (error) {
      console.error("Error leaving tribe: ", error);
      toast({ title: 'Error', description: 'Failed to leave tribe.', variant: 'destructive' });
    }
  };

  const handleAnswerChange = (question: string, value: string) => {
    setTutorialAnswers(prev => ({ ...prev, [question]: value }));
  };

  const handleSaveAnswers = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      await saveTutorialAnswers({ answers: tutorialAnswers, idToken });
      toast({ title: 'Success', description: 'Your tutorial answers have been saved.' });
    } catch (error) {
      console.error("Error saving tutorial answers: ", error);
      toast({ title: 'Error', description: 'Failed to save your answers.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    const location = place.formatted_address || '';
    const coords = place.geometry?.location ? {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    } : null;
    
    setNewTribeLocation(location);
    setNewTribeCoords(coords);
  };
  
  if (isLoading || !isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-2xl font-semibold">Loading Your Dashboard...</div>
        <p className="text-muted-foreground">Please wait a moment.</p>
      </div>
    );
  }
  
  if (loadError) {
    return <div className="flex items-center justify-center min-h-screen">Error loading maps. Please check your API key setup.</div>
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl mb-4">You must be logged in to view your tribe dashboard.</p>
        <Link href="/" passHref>
          <Button>Back to Path</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Tribe Dashboard</h1>
        <Link href="/" passHref>
          <Button variant="outline">Back to Path</Button>
        </Link>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <aside className="lg:col-span-1 space-y-8">
          {userTribe ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Tribe</CardTitle>
                <CardDescription>You are a member of {userTribe.name}.</CardDescription>
              </CardHeader>
              <CardContent>
                <p><span className="font-semibold">Location:</span> {userTribe.location}</p>
                <p><span className="font-semibold">Members:</span> {userTribe.members.length}</p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleLeaveTribe(userTribe.id)} variant="destructive" className="w-full">Leave Tribe</Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create a New Tribe</CardTitle>
                <CardDescription>Start your own tribe and invite others to join.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="tribe-name">Tribe Name</Label>
                    <Input
                        id="tribe-name"
                        value={newTribeName}
                        onChange={(e) => setNewTribeName(e.target.value)}
                        placeholder="Enter tribe name"
                    />
                </div>
                 <div className="space-y-2">
                    <div className="mb-2">
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={newTribeCoords || defaultCenter}
                            zoom={newTribeCoords ? 12 : 4}
                        >
                            {newTribeCoords && <MarkerF position={newTribeCoords} />}
                        </GoogleMap>
                    </div>
                    <Label htmlFor="tribe-location">Location</Label>
                    <LocationAutocomplete
                        id="tribe-location"
                        onPlaceSelected={handlePlaceSelected}
                        placeholder="e.g., New York, NY"
                        disabled={!isLoaded}
                        initialValue={newTribeLocation}
                    />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleCreateTribe} className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Tribe'}
                </Button>
              </CardFooter>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Available Tribes</CardTitle>
              <CardDescription>Find other tribes you can apply to join.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-60 overflow-y-auto">
                {tribes.filter(t => t.id !== userTribe?.id).length > 0 ? (
                  tribes.filter(t => t.id !== userTribe?.id).map((tribe) => (
                    <div key={tribe.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{tribe.name}</h3>
                        <p className="text-sm text-muted-foreground">{tribe.location}</p>
                      </div>
                      <Button size="sm" onClick={() => handleJoinTribe(tribe.id)} disabled={!!userTribe}>
                        Apply
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No other tribes available to join right now.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>My Living Tutorial</CardTitle>
              <CardDescription>Review and edit your answers. Your progress is saved as you type.</CardDescription>
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
          <Card>
            <CardHeader>
              <CardTitle>Guidance from The Chief</CardTitle>
              <CardDescription>Review your past tutorial submissions and guidance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
              {tutorialFeedback.length > 0 ? (
                tutorialFeedback.map(fb => (
                  <Alert key={fb.id}>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle className="flex justify-between">
                      <span>Guidance Received</span>
                      <span className="text-sm font-normal text-muted-foreground">{new Date(fb.createdAt).toLocaleString()}</span>
                    </AlertTitle>
                    <AlertDescription>
                      {fb.feedback}
                    </AlertDescription>
                  </Alert>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">You have not received any guidance from The Chief yet.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
