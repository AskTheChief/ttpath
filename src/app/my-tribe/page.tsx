
'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { leaveTribe } from '@/lib/tribes';
import { getTutorialAnswers } from '@/ai/flows/get-tutorial-answers';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { createTribe } from '@/ai/flows/create-tribe';
import { joinTribe } from '@/ai/flows/join-tribe';
import { getTribes } from '@/ai/flows/get-tribes';
import { useLoadScript, Libraries, GoogleMap, MarkerF, MarkerClustererF, InfoWindowF } from '@react-google-maps/api';
import LocationAutocomplete from '@/components/location-autocomplete';
import type { Tribe, Meeting, Application, UserProfile, GetTutorialAnswersOutput } from '@/lib/types';
import { deleteTribe } from '@/ai/flows/delete-tribe';
import { updateTribeMeetings } from '@/ai/flows/update-tribe-meetings';
import { manageApplication } from '@/ai/flows/manage-applications';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { doc, getDoc } from 'firebase/firestore';
import { getUserProfile, updateUserProfile } from '@/ai/flows/user-profile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const libraries: Libraries = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

const overviewMapContainerStyle = {
    width: '100%',
    height: '300px',
    borderRadius: '0.5rem',
}

const defaultCenter = {
    lat: 39.8283,
    lng: -98.5795,
};

export default function MyTribePage() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Partial<UserProfile>>({});
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [newTribeName, setNewTribeName] = useState('');
  const [newTribeLocation, setNewTribeLocation] = useState('');
  const [newTribeCoords, setNewTribeCoords] = useState<{lat: number; lng: number} | null>(null);
  const [userTribe, setUserTribe] = useState<Tribe | null>(null);
  const [tutorialData, setTutorialData] = useState<GetTutorialAnswersOutput>({ answers: {} });
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingAnswers, setIsFetchingAnswers] = useState(false);
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmPm] = useState('PM');

  const { toast } = useToast();
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const isChief = userTribe && userTribe.chief === user?.uid;

  const fetchTribesAndUserData = useCallback(async (currentUser: User) => {
    try {
      setIsLoading(true);
      const idToken = await currentUser.getIdToken();
      const [allTribes, appsResult, profile] = await Promise.all([
        getTribes({}),
        manageApplication({ action: 'get', idToken }),
        getUserProfile({ idToken }),
      ]);

      setUserProfile(profile);

      const tribesWithMembers = allTribes.map(t => ({
        ...t,
        members: t.members || [],
        meetings: t.meetings?.map(m => ({ ...m, date: new Date(m.date) })) || []
      }));

      setTribes(tribesWithMembers as Tribe[]);
      const currentUserTribe = (tribesWithMembers as Tribe[]).find(tribe => tribe.members.includes(currentUser.uid));
      setUserTribe(currentUserTribe || null);
      
      if (appsResult.success && appsResult.applications) {
        const sortedApps = appsResult.applications.map(app => ({
          ...app,
          createdAt: new Date(app.createdAt), // Convert ISO string to Date object
        })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setApplications(sortedApps);
      } else if (!appsResult.success) {
        throw new Error(appsResult.message || "Failed to fetch applications.");
      }

    } catch (error) {
        console.error("Error fetching page data: ", error);
        toast({ title: 'Error', description: 'Could not load your tribe and tutorial data.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchTribesAndUserData(currentUser);
        setIsFetchingAnswers(true);
        try {
            const idToken = await currentUser.getIdToken();
            const data = await getTutorialAnswers({ idToken });
            setTutorialData(data);
        } catch (error) {
            console.error("Failed to fetch answers:", error);
            toast({ title: 'Error fetching answers', variant: 'destructive' });
        } finally {
            setIsFetchingAnswers(false);
        }
      } else {
        // Clear all data if user logs out
        setTribes([]);
        setUserTribe(null);
        setTutorialData({ answers: {} });
        setApplications([]);
        setUserProfile({});
        setIsLoading(false);
      }
    });

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [fetchTribesAndUserData, toast]);


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
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const userAnswersData = await getTutorialAnswers({ idToken });
      const result = await joinTribe({ tribeId, idToken, answers: userAnswersData.answers });
      if (result.success) {
        toast({ title: 'Application Sent', description: 'Your request to join has been sent to the Tribe Chief.' });
      } else {
        throw new Error(result.message || "Failed to send application.");
      }
      setSelectedTribe(null); // Close info card on success
      if (user) fetchTribesAndUserData(user);
    } catch (error: any) {
      console.error("Error joining tribe: ", error);
      toast({ title: 'Error', description: error.message || 'Failed to join tribe.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
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

  const handleDeleteTribe = async (tribeId: string) => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    
    try {
      const idToken = await user.getIdToken();
      const result = await deleteTribe({ tribeId, idToken });
      if (result.success) {
        toast({ title: 'Tribe Deleted', description: 'The tribe has been successfully deleted.' });
        if (user) fetchTribesAndUserData(user);
      } else {
        throw new Error(result.message || 'Failed to delete tribe.');
      }
    } catch (error: any) {
      console.error("Error deleting tribe: ", error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAnswerChange = (question: string, value: string) => {
    setTutorialData(prev => ({...prev, answers: { ...prev.answers, [question]: value }}));
  };

  const handleSaveAnswers = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      await saveTutorialAnswers({ answers: tutorialData.answers, idToken });
      toast({ title: 'Success', description: 'Your tutorial answers have been saved.' });
    } catch (error) {
      console.error("Error saving tutorial answers: ", error);
      toast({ title: 'Error', description: 'Failed to save your answers.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    setNewTribeLocation(place.formatted_address || '');
    setNewTribeCoords(place.geometry?.location ? {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
    } : null);
  };

  const handleAddMeeting = async () => {
    if (!userTribe || !user || !selectedDate) return;

    let hours = parseInt(hour, 10);
    const minutes = parseInt(minute, 10);

    if (isNaN(hours) || isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      toast({ title: 'Invalid Time', description: 'Please enter a valid time.', variant: 'destructive' });
      return;
    }

    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (ampm === 'AM' && hours === 12) { // Midnight case
      hours = 0;
    }

    const combinedDateTime = new Date(selectedDate);
    combinedDateTime.setHours(hours, minutes, 0, 0);
  
    const newMeeting = {
      id: new Date().toISOString(), // Generate a unique ID for the meeting
      date: combinedDateTime,
    };
  
    const updatedMeetings = [...(userTribe.meetings || []), newMeeting];
  
    try {
      const idToken = await user.getIdToken();
      const result = await updateTribeMeetings({
        tribeId: userTribe.id,
        meetings: updatedMeetings.map(m => ({ ...m, date: m.date.toISOString() })),
        idToken,
      });
  
      if (result.success) {
        toast({ title: 'Meeting Scheduled', description: 'The new meeting has been added.' });
        // Optimistically update local state to reflect the change immediately
        setUserTribe(prev => prev ? { ...prev, meetings: updatedMeetings } : null);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ title: 'Error Scheduling Meeting', description: error.message, variant: 'destructive' });
    }
  };
  
  const handleDeleteMeeting = async (meetingId: string) => {
    if (!userTribe || !user) return;
  
    const updatedMeetings = (userTribe.meetings || []).filter(m => m.id !== meetingId);
  
    try {
      const idToken = await user.getIdToken();
      const result = await updateTribeMeetings({
        tribeId: userTribe.id,
        meetings: updatedMeetings.map(m => ({ ...m, date: m.date.toISOString() })),
        idToken,
      });
  
      if (result.success) {
        toast({ title: 'Meeting Canceled', description: 'The meeting has been removed.' });
        // Optimistically update local state
        setUserTribe(prev => prev ? { ...prev, meetings: updatedMeetings } : null);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ title: 'Error Canceling Meeting', description: error.message, variant: 'destructive' });
    }
  };

  const handleApplicationAction = async (action: 'approve' | 'deny', application: Application) => {
    if (!user) return;
    setIsLoading(true);
    try {
        const idToken = await user.getIdToken();
        const result = await manageApplication({
            action,
            applicationId: application.id,
            tribeId: application.tribeId,
            applicantId: application.applicantId,
            idToken
        });
        if (result.success) {
            toast({ title: `Application ${action}d`, description: 'The list has been updated.' });
            fetchTribesAndUserData(user); // Refresh all data
        } else {
            throw new Error(result.message || `Failed to ${action} application.`);
        }
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
};

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setUserProfile(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const result = await updateUserProfile({ idToken, profile: userProfile as UserProfile });
      if (result.success) {
        toast({ title: 'Profile Updated', description: 'Your information has been saved.' });
      } else {
        throw new Error(result.message || 'Failed to update profile.');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
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

  const availableTribes = tribes.filter(t => t.id !== userTribe?.id);

  const upcomingMeetings = (userTribe?.meetings || [])
    .filter(m => new Date(m.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const meetingDates = userTribe?.meetings?.map(m => new Date(m.date)) || [];


  return (
    <div className="container mx-auto p-4 sm:p:6 lg:p:8">
      <header className="flex justify-between items-center mb:8">
        <h1 className="text-3xl font-bold">My Tribe Dashboard</h1>
        <Link href="/" passHref>
          <Button variant="outline">Back to Path</Button>
        </Link>
      </header>

      <div className="grid lg:grid-cols-3 gap:8">
        <aside className="lg:col-span-1 space-y:8">
          {userTribe ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Tribe</CardTitle>
                <CardDescription>You are a {isChief ? 'Chief' : 'Member'} of the <span className="font-bold text-primary">{userTribe.name}</span> tribe.</CardDescription>
              </CardHeader>
              <CardContent>
                <p><span className="font-semibold">Location:</span> {userTribe.location}</p>
                <p><span className="font-semibold">Members:</span> {userTribe.members.length}</p>
              </CardContent>
              <CardFooter className="flex flex-col space-y:2">
                {isChief && (
                   <Button onClick={() => handleDeleteTribe(userTribe.id)} variant="destructive" className="w-full">Delete Tribe</Button>
                )}
                <Button onClick={() => handleLeaveTribe(userTribe.id)} variant="outline" className="w-full">Leave Tribe</Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create a New Tribe</CardTitle>
                <CardDescription>Start your own tribe and invite others to join.</CardDescription>
              </CardHeader>
              <CardContent className="space-y:4">
                <div className="space-y:2">
                    <Label htmlFor="tribe-name">Tribe Name</Label>
                    <Input
                        id="tribe-name"
                        value={newTribeName}
                        onChange={(e) => setNewTribeName(e.target.value)}
                        placeholder="Enter tribe name"
                        autoFocus
                    />
                </div>
                 <div className="space-y:2">
                    <Label htmlFor="tribe-location">Location</Label>
                    <LocationAutocomplete
                        id="tribe-location"
                        onPlaceSelected={handlePlaceSelected}
                        placeholder="e:g:, 123 Main St, Anytown, USA"
                        disabled={!isLoaded}
                        initialValue={newTribeLocation}
                    />
                    <p className="text-sm text-muted-foreground pt:1">
                      Enter your house number, street, city, and state. Click your address from the dropdown when you see it.
                    </p>
                     <div className="mt:2">
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={newTribeCoords || defaultCenter}
                            zoom={newTribeCoords ? 12 : 4}
                            options={{
                                disableDefaultUI: true,
                            }}
                        >
                            {newTribeCoords && <MarkerF position={newTribeCoords} />}
                        </GoogleMap>
                    </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleCreateTribe} className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Tribe'}
                </Button>
              </CardFooter>
            </Card>
          )}

          {userTribe && (
            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Meetings</CardTitle>
                </CardHeader>
                <CardContent>
                     {upcomingMeetings.length > 0 ? (
                        <ul className="space-y:3">
                            {upcomingMeetings.map(meeting => (
                                <li key={meeting.id} className="flex flex-col p:2 border rounded-md">
                                    <span className="font-semibold">{format(new Date(meeting.date), 'PPP p')}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No upcoming meetings scheduled.</p>
                    )}
                </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Available Tribes</CardTitle>
              <CardDescription>Find other tribes you can apply to join.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y:4 max-h:60 overflow-y:auto">
                {availableTribes.length > 0 ? (
                  availableTribes.map((tribe) => (
                    <div key={tribe.id} className="flex items-center justify-between p:3 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{tribe.name}</h3>
                        <p className="text-sm text-muted-foreground">{tribe.location}</p>
                      </div>
                      <Button size="sm" onClick={() => handleJoinTribe(tribe.id)} disabled={!!userTribe || isLoading}>
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
          
          <Card>
             <CardHeader>
                <CardTitle>Tribes Overview</CardTitle>
                <CardDescription>Click a marker to learn more about a tribe.</CardDescription>
            </CardHeader>
            <CardContent>
                <div style={overviewMapContainerStyle}>
                    <GoogleMap
                        mapContainerStyle={{ height: '100%', width: '100%' }}
                        center={defaultCenter}
                        zoom={1}
                        options={{ disableDefaultUI: true }}
                        onClick={() => setSelectedTribe(null)}
                    >
                        <MarkerClustererF>
                            {(clusterer) => tribes.map((tribe) => (
                                tribe.lat && tribe.lng && (
                                    <MarkerF
                                        key={tribe.id}
                                        position={{ lat: tribe.lat, lng: tribe.lng }}
                                        onClick={() => setSelectedTribe(tribe)}
                                        clusterer={clusterer}
                                    />
                                )
                            ))}
                        </MarkerClustererF>
                        {selectedTribe && selectedTribe.lat && selectedTribe.lng && (
                            <InfoWindowF
                                position={{ lat: selectedTribe.lat, lng: selectedTribe.lng }}
                                onCloseClick={() => setSelectedTribe(null)}
                            >
                                <div className="p-2">
                                    <h3 className="font-bold text-base mb-1">{selectedTribe.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-2">{selectedTribe.location}</p>
                                    <Button 
                                        size="sm" 
                                        className="w-full" 
                                        onClick={() => handleJoinTribe(selectedTribe.id)} 
                                        disabled={!!userTribe || selectedTribe.id === userTribe?.id || isLoading}
                                    >
                                        {selectedTribe.id === userTribe?.id ? 'Your Tribe' : 'Request to Join'}
                                    </Button>
                                </div>
                            </InfoWindowF>
                        )}
                    </GoogleMap>
                </div>
            </CardContent>
          </Card>

        </aside>

        <main className="lg:col-span-2 space-y:8">
            <Card>
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>View and update your personal information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y:4">
                <div className="grid sm:grid-cols-2 gap:4">
                  <div className="space-y:2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={userProfile.firstName || ''} onChange={handleProfileChange} />
                  </div>
                  <div className="space-y:2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={userProfile.lastName || ''} onChange={handleProfileChange} />
                  </div>
                </div>
                <div className="space-y:2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={userProfile.address || ''} onChange={handleProfileChange} />
                </div>
                <div className="space-y:2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={userProfile.phone || ''} onChange={handleProfileChange} />
                </div>
                <div className="space-y:2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={userProfile.email || ''} disabled />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveProfile} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Profile'}
                </Button>
              </CardFooter>
            </Card>

            {isChief && userTribe && (
              <>
                {applications && applications.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Applications</CardTitle>
                            <CardDescription>Review and respond to applicants for your tribe.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {applications.map(app => (
                                    <AccordionItem key={app.id} value={app.id}>
                                        <AccordionTrigger>
                                          <div className="flex flex-col items-start">
                                            <span>Applicant: {app.applicantId.substring(0, 8)}...</span>
                                            <span className="text-xs text-muted-foreground">{new Date(app.createdAt).toLocaleString()}</span>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y:4">
                                                <div>
                                                    <h4 className="font-semibold mb:2">Tutorial Answers</h4>
                                                    <div className="space-y:2 text-sm p:3 border rounded-md max-h:60 overflow-y:auto">
                                                        {Object.entries(app.answers || {}).map(([question, answer]) => (
                                                            <div key={question}>
                                                                <p className="font-medium">{question}</p>
                                                                <p className="text-muted-foreground whitespace-pre-wrap">{answer || "No answer provided."}</p>
                                                            </div>
                                                        ))}
                                                        {(!app.answers || Object.keys(app.answers).length === 0) && <p>No answers provided.</p>}
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap:2 pt:2">
                                                    <Button variant="destructive" onClick={() => handleApplicationAction('deny', app)} disabled={isLoading}>Deny</Button>
                                                    <Button onClick={() => handleApplicationAction('approve', app)} disabled={isLoading}>Approve</Button>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle>Manage Meetings</CardTitle>
                        <CardDescription>Schedule and view meetings for your tribe.</CardDescription>
                        <p className="text-sm font-semibold pt:2">Current Time: {currentTime.toLocaleTimeString()}</p>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap:6">
                        <div>
                             <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                className="rounded-md border"
                                disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                                modifiers={{ meetings: meetingDates }}
                                modifiersStyles={{ meetings: { textDecoration: 'underline' } }}
                            />
                            <div className="flex items-center gap:2 mt:4">
                               <Label htmlFor="meeting-time" className="mb:0 whitespace-nowrap">Time:</Label>
                               <div className="flex w-full items-center gap-2">
                                    <Input
                                        id="hour"
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={hour}
                                        onChange={(e) => setHour(e.target.value)}
                                        className="w-full text-center"
                                    />
                                    <span>:</span>
                                    <Input
                                        id="minute"
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={minute}
                                        onChange={(e) => setMinute(e.target.value.padStart(2, '0'))}
                                        className="w-full text-center"
                                    />
                                    <Select value={ampm} onValueChange={setAmPm}>
                                        <SelectTrigger className="w-[80px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AM">AM</SelectItem>
                                            <SelectItem value="PM">PM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                             <Button onClick={handleAddMeeting} className="w-full mt:4" disabled={!selectedDate}>Schedule Meeting</Button>
                        </div>
                        <div>
                            <h3 className="font-semibold mb:2">Upcoming Meetings</h3>
                            {upcomingMeetings.length > 0 ? (
                                <ul className="space-y:2 max-h:80 overflow-y:auto">
                                    {upcomingMeetings.map(meeting => (
                                        <li key={meeting.id} className="flex items-center justify-between p:2 border rounded-md">
                                            <div className="flex-1">
                                                <p className="font-medium">{format(new Date(meeting.date), 'PPP p')}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteMeeting(meeting.id)}>
                                                <Trash2 className="h:4 w:4" />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-center text-muted-foreground bg-gray-50 p:4 rounded-md">No upcoming meetings.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </>
            )}

          <Card>
            <CardHeader>
              <CardTitle>Comprehension Test</CardTitle>
              <CardDescription>You may review and edit your answers and save your work below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y:6">
              {isFetchingAnswers ? (
                 <p>Loading your answers...</p>
              ) : (
                tutorialQuestions.map((q, i) => (
                  <div key={i} className="grid w-full gap:1.5">
                    <Label htmlFor={`question-${i}`}>{i + 1}. {q}</Label>
                    <Textarea
                      id={`question-${i}`}
                      rows={5}
                      value={tutorialData.answers[q] || ''}
                      onChange={(e) => handleAnswerChange(q, e.target.value)}
                      placeholder="Your answer..."
                      disabled={isLoading}
                    />
                  </div>
                ))
              )}
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
              <CardDescription>Review your most recent tutorial submission feedback.</CardDescription>
            </CardHeader>
            <CardContent className="space-y:4 max-h:96 overflow-y:auto">
              {tutorialData.latestFeedback ? (
                  <Alert>
                    <Terminal className="h:4 w:4" />
                    <AlertTitle className="flex justify-between">
                      <span>You Receive Guidance</span>
                      <span className="text-sm font-normal text-muted-foreground">{new Date(tutorialData.latestFeedback.createdAt).toLocaleString()}</span>
                    </AlertTitle>
                    <AlertDescription>
                      {tutorialData.latestFeedback.feedback}
                    </AlertDescription>
                  </Alert>
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
