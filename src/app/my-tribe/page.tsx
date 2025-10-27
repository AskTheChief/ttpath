
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { Terminal, Users, Loader2, Home, UserCheck, Shield, Trash2, User as UserIcon } from 'lucide-react';
import { createTribe } from '@/ai/flows/create-tribe';
import { joinTribe } from '@/ai/flows/join-tribe';
import { getTribes } from '@/ai/flows/get-tribes';
import { useLoadScript, Libraries, GoogleMap, MarkerF, MarkerClustererF, InfoWindowF } from '@react-google-maps/api';
import LocationAutocomplete from '@/components/location-autocomplete';
import type { Tribe, Meeting, Application, UserProfile, GetTutorialAnswersOutput, TribeMember, MeetingReport } from '@/lib/types';
import { deleteTribe } from '@/ai/flows/delete-tribe';
import { updateTribeMeetings } from '@/ai/flows/update-tribe-meetings';
import { manageApplication } from '@/ai/flows/manage-applications';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { getUserProfile, updateUserProfile } from '@/ai/flows/user-profile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTribeMembers } from '@/ai/flows/get-tribe-members';
import { getMeetingReports } from '@/ai/flows/get-meeting-reports';
import ReportModal from '@/components/modals/report-modal';
import { evaluateTutorialAnswers } from '@/ai/flows/evaluate-tutorial-answers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';


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

function MyTribePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams.get('view') || 'guest';

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Partial<UserProfile>>({});
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [newTribeName, setNewTribeName] = useState('');
  const [newTribeLocation, setNewTribeLocation] = useState('');
  const [newTribeCoords, setNewTribeCoords] = useState<{lat: number; lng: number} | null>(null);
  const [userTribe, setUserTribe] = useState<Tribe | null>(null);
  const [tribeMembers, setTribeMembers] = useState<TribeMember[]>([]);
  const [tutorialData, setTutorialData] = useState<GetTutorialAnswersOutput>({ answers: {} });
  const [applications, setApplications] = useState<Application[]>([]);
  const [meetingReports, setMeetingReports] = useState<MeetingReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingAnswers, setIsFetchingAnswers] = useState(false);
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmPm] = useState('PM');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

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
      
      if (currentUserTribe) {
          const [members, reports] = await Promise.all([
             getTribeMembers({ tribeId: currentUserTribe.id, idToken }),
             getMeetingReports({ tribeId: currentUserTribe.id, idToken }),
          ]);
          setTribeMembers(members);
          setMeetingReports(reports);
      } else {
          setTribeMembers([]);
          setMeetingReports([]);
      }

      if (appsResult.success && appsResult.applications) {
        const sortedApps = appsResult.applications.map(app => ({
          ...app,
          createdAt: new Date(app.createdAt),
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
        setTribes([]);
        setUserTribe(null);
        setTribeMembers([]);
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

  const handleTabChange = (value: string) => {
    router.push(`/my-tribe?view=${value}`);
  };

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
        if (user) fetchTribesAndUserData(user); // Refresh data
      } else {
        throw new Error(result.message || 'Failed to create tribe.');
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
        if (user) fetchTribesAndUserData(user); // Refresh data
      } else {
        throw new Error(result.message || "Failed to send application.");
      }
      setSelectedTribe(null); // Close info card on success
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
      if (user) fetchTribesAndUserData(user); // Refresh data
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
        if (user) fetchTribesAndUserData(user); // Refresh data
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
    if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }

    const combinedDateTime = new Date(selectedDate);
    combinedDateTime.setHours(hours, minutes, 0, 0);
  
    const newMeeting = {
      id: new Date().toISOString(),
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
        if (user) fetchTribesAndUserData(user);
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
        if (user) fetchTribesAndUserData(user);
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
            fetchTribesAndUserData(user);
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

  const handleMeetingReportAction = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsReportModalOpen(true);
  };

  const handleReceiveFeedback = async () => {
    if (!user) return;
    setIsEvaluating(true);
    try {
        const idToken = await user.getIdToken();
        const evaluation = await evaluateTutorialAnswers({ answers: tutorialData.answers, idToken });
        
        setTutorialData(prev => ({
            ...prev,
            latestFeedback: {
                feedback: evaluation.feedback,
                createdAt: new Date().toISOString(),
            }
        }));

        toast({
            title: "You Receive Guidance",
            description: "The Chief provides new feedback for you to consider.",
        });

    } catch (error: any) {
        toast({
            title: "An Error Occurred",
            description: error.message || "There was a problem getting feedback. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsEvaluating(false);
    }
  };
  
  if (isLoading || !isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-2xl font-semibold">Loading Your Account...</div>
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
        <p className="text-xl mb-4">You must be logged in to view your account.</p>
        <Link href="/" passHref>
          <Button>Back to Path</Button>
        </Link>
      </div>
    );
  }

  const availableTribes = tribes.filter(t => t.id !== userTribe?.id);
  const now = new Date();
  const upcomingMeetings = (userTribe?.meetings || [])
    .filter(m => new Date(m.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const pastMeetings = (userTribe?.meetings || [])
    .filter(m => new Date(m.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const meetingDates = userTribe?.meetings?.map(m => new Date(m.date)) || [];

  const tabTriggerClasses = "transition-all duration-200 data-[state=active]:text-primary data-[state=active]:ring-2 data-[state=active]:ring-primary data-[state=active]:shadow-lg hover:bg-muted/50 data-[state=inactive]:bg-muted";

  return (
    <>
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Account</h1>
        <Link href="/" passHref>
          <Button variant="outline">
            <Home className="mr-2" /> Back to Path
          </Button>
        </Link>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>View and update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="firstName">First Name</Label><Input id="firstName" value={userProfile.firstName || ''} onChange={handleProfileChange} /></div>
                <div className="space-y-2"><Label htmlFor="lastName">Last Name</Label><Input id="lastName" value={userProfile.lastName || ''} onChange={handleProfileChange} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="address">Address</Label><Input id="address" value={userProfile.address || ''} onChange={handleProfileChange} /></div>
              <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" value={userProfile.phone || ''} onChange={handleProfileChange} /></div>
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={userProfile.email || ''} disabled /></div>
            </CardContent>
            <CardFooter><Button onClick={handleSaveProfile} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Profile'}</Button></CardFooter>
          </Card>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <Card>
                <AccordionTrigger className="w-full">
                  <CardHeader className="flex-row items-center justify-between w-full p-6">
                    <div>
                      <CardTitle>Comprehension Test</CardTitle>
                      <CardDescription>Click to view/edit your answers.</CardDescription>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-6">
                    {isFetchingAnswers ? (<p>Loading your answers...</p>) : (
                      tutorialQuestions.map((q, i) => (
                        <div key={i} className="grid w-full gap-1.5">
                          <Label htmlFor={`question-${i}`}>{i + 1}. {q}</Label>
                          <Textarea id={`question-${i}`} rows={5} value={tutorialData.answers[q] || ''} onChange={(e) => handleAnswerChange(q, e.target.value)} placeholder="Your answer..." disabled={isLoading || isEvaluating} />
                        </div>
                      ))
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2 justify-end">
                    <Button onClick={handleSaveAnswers} variant="secondary" disabled={isLoading || isEvaluating}>{isLoading ? 'Saving...' : 'Save Answers'}</Button>
                    <Button onClick={handleReceiveFeedback} disabled={isLoading || isEvaluating}>{isEvaluating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating...</> : 'Receive Feedback from The Chief'}</Button>
                  </CardFooter>
                  {tutorialData.latestFeedback && (
                    <CardContent>
                      <Alert>
                        <Terminal className="h-4 w-4" />
                        <AlertTitle className="flex justify-between">
                          <span>You Receive Guidance</span>
                          <span className="text-sm font-normal text-muted-foreground">{new Date(tutorialData.latestFeedback.createdAt).toLocaleString()}</span>
                        </AlertTitle>
                        <AlertDescription>{tutorialData.latestFeedback.feedback}</AlertDescription>
                      </Alert>
                    </CardContent>
                  )}
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>
        </div>

        <main className="lg:col-span-2 space-y-8">
          <Tabs value={view} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4 gap-2">
              <TabsTrigger value="guest" className={tabTriggerClasses}>
                <UserIcon className="mr-2" /> Guest
              </TabsTrigger>
              <TabsTrigger value="member" className={tabTriggerClasses}>
                <UserCheck className="mr-2" /> Member
              </TabsTrigger>
              <TabsTrigger value="chief" className={tabTriggerClasses}>
                <Shield className="mr-2" /> Chief
              </TabsTrigger>
              <TabsTrigger value="mentor" className={tabTriggerClasses}>
                <Users className="mr-2" /> Mentor
              </TabsTrigger>
            </TabsList>

            <TabsContent value="guest" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome, Guest!</CardTitle>
                  <CardDescription>This is your starting point. Review your profile and complete the comprehension test on the left to progress.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>When you are ready, advance on the Path to Graduate to unlock more options.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="member" className="mt-6">
              <div className="space-y-8">
                {userTribe ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Your Tribe: <span className="text-primary">{userTribe.name}</span></CardTitle>
                        <CardDescription>You are a {isChief ? 'Chief' : 'Member'} of this tribe.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p><span className="font-semibold">Location:</span> {userTribe.location}</p>
                        <p><span className="font-semibold">Members:</span> {userTribe.members.length}</p>
                      </CardContent>
                      <CardFooter>
                        <Button onClick={() => handleLeaveTribe(userTribe.id)} variant="outline" className="w-full">Leave Tribe</Button>
                      </CardFooter>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle>Upcoming Meetings</CardTitle></CardHeader>
                      <CardContent>
                        {upcomingMeetings.length > 0 ? (
                          <ul className="space-y-3">
                            {upcomingMeetings.map(meeting => (
                              <li key={meeting.id} className="flex flex-col p-2 border rounded-md">
                                <span className="font-semibold">{format(new Date(meeting.date), 'PPP p')}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No upcoming meetings scheduled.</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle>Past Meetings</CardTitle></CardHeader>
                      <CardContent>
                        {pastMeetings.length > 0 ? (
                          <ul className="space-y-3">
                            {pastMeetings.map(meeting => {
                              const hasReport = meetingReports.some(r => r.meetingId === meeting.id);
                              return (
                                <li key={meeting.id} className="flex items-center justify-between p-2 border rounded-md">
                                  <span className="font-semibold">{format(new Date(meeting.date), 'PPP')}</span>
                                  <Button variant="secondary" size="sm" onClick={() => handleMeetingReportAction(meeting)}>
                                    {hasReport ? 'View Report' : 'Submit Report'}
                                  </Button>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No past meetings.</p>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Join a Tribe</CardTitle>
                      <CardDescription>Find and apply to a tribe near you.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-60 overflow-y-auto">
                        {availableTribes.length > 0 ? (
                          availableTribes.map((tribe) => (
                            <div key={tribe.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                )}
              </div>
            </TabsContent>

            <TabsContent value="chief" className="mt-6">
              <div className="space-y-8">
                <Card>
                  <CardHeader><CardTitle>Start a Tribe</CardTitle><CardDescription>Start your own tribe and invite others to join.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="tribe-name-chief">Tribe Name</Label><Input id="tribe-name-chief" value={newTribeName} onChange={(e) => setNewTribeName(e.target.value)} placeholder="Enter tribe name" /></div>
                    <div className="space-y-2">
                      <Label htmlFor="tribe-location-chief">Location</Label>
                      <LocationAutocomplete id="tribe-location-chief" onPlaceSelected={handlePlaceSelected} placeholder="e.g., 123 Main St, Anytown, USA" disabled={!isLoaded} initialValue={newTribeLocation} />
                      <p className="text-sm text-muted-foreground pt-1">Enter your house number, street, city, and state. Click your address from the dropdown when you see it.</p>
                      <div className="mt-2">
                          <GoogleMap mapContainerStyle={mapContainerStyle} center={newTribeCoords || defaultCenter} zoom={newTribeCoords ? 12 : 4} options={{ disableDefaultUI: true }}><MarkerF position={newTribeCoords || defaultCenter} /></GoogleMap>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter><Button onClick={handleCreateTribe} className="w-full" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create Tribe'}</Button></CardFooter>
                </Card>
                {isChief && (
                  <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Manage Meetings</CardTitle><CardDescription>Schedule and view meetings for your tribe.</CardDescription>
                      <p className="text-sm font-semibold pt-2">Current Time: {currentTime.toLocaleTimeString()}</p>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))} modifiers={{ meetings: meetingDates }} modifiersStyles={{ meetings: { textDecoration: 'underline' } }} />
                        <div className="flex items-center gap-2 mt-4">
                          <Label htmlFor="meeting-time" className="mb-0 whitespace-nowrap">Time:</Label>
                          <div className="flex w-full items-center gap-2">
                            <Input id="hour" type="number" min="1" max="12" value={hour} onChange={(e) => setHour(e.target.value)} className="w-full text-center" />
                            <span>:</span>
                            <Input id="minute" type="number" min="0" max="59" value={minute} onChange={(e) => setMinute(e.target.value.padStart(2, '0'))} className="w-full text-center" />
                            <Select value={ampm} onValueChange={setAmPm}><SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent></Select>
                          </div>
                        </div>
                        <Button onClick={handleAddMeeting} className="w-full mt-4" disabled={!selectedDate}>Schedule Meeting</Button>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Upcoming Meetings</h3>
                        {upcomingMeetings.length > 0 ? (
                          <ul className="space-y-2 max-h-80 overflow-y-auto">{upcomingMeetings.map(meeting => (<li key={meeting.id} className="flex items-center justify-between p-2 border rounded-md"><div className="flex-1"><p className="font-medium">{format(new Date(meeting.date), 'PPP p')}</p></div><Button variant="ghost" size="icon" onClick={() => handleDeleteMeeting(meeting.id)}><Trash2 className="h-4 w-4" /></Button></li>))}</ul>
                        ) : (<p className="text-sm text-center text-muted-foreground bg-gray-50 p-4 rounded-md">No upcoming meetings.</p>)}
                      </div>
                    </CardContent>
                  </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users />Tribe Members</CardTitle>
                        <CardDescription>As Chief, you can view member details and their test answers.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                          {tribeMembers.map(member => (
                            <AccordionItem key={member.uid} value={member.uid}>
                              <AccordionTrigger>{member.firstName} {member.lastName}</AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4">
                                  <div><p className="text-sm"><span className="font-semibold">Email:</span> {member.email}</p><p className="text-sm"><span className="font-semibold">Phone:</span> {member.phone}</p></div>
                                  {member.answers && (
                                    <div>
                                      <h4 className="font-semibold mb-2">Comprehension Answers</h4>
                                      <div className="space-y-3 text-sm p-3 border rounded-md max-h-60 overflow-y-auto bg-muted/50">
                                        {tutorialQuestions.map((q, i) => (<div key={i}><p className="font-medium">{i + 1}. {q}</p><p className="text-muted-foreground whitespace-pre-wrap pl-2">{member.answers?.[q] || "No answer provided."}</p></div>))}
                                        {Object.keys(member.answers).length === 0 && <p>No answers submitted.</p>}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                    {applications && applications.length > 0 && (
                      <Card>
                        <CardHeader><CardTitle>Pending Applications</CardTitle><CardDescription>Review and respond to applicants for your tribe.</CardDescription></CardHeader>
                        <CardContent>
                          <Accordion type="single" collapsible className="w-full">
                            {applications.map(app => (
                              <AccordionItem key={app.id} value={app.id}>
                                <AccordionTrigger><div className="flex flex-col items-start"><span>Applicant: {app.applicantName}</span><span className="text-xs text-muted-foreground">{new Date(app.createdAt).toLocaleString()}</span></div></AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-4">
                                    <div><h4 className="font-semibold mb-2">Applicant Information</h4><div className="text-sm space-y-1"><p><span className="font-medium">Email:</span> {app.applicantEmail || 'N/A'}</p><p><span className="font-medium">Phone:</span> {app.applicantPhone || 'N/A'}</p></div></div>
                                    <div>
                                      <h4 className="font-semibold mb-2">Tutorial Answers</h4>
                                      <div className="space-y-2 text-sm p-3 border rounded-md max-h-60 overflow-y-auto">{Object.entries(app.answers || {}).map(([question, answer]) => (<div key={question}><p className="font-medium">{question}</p><p className="text-muted-foreground whitespace-pre-wrap">{answer || "No answer provided."}</p></div>))}
                                        {(!app.answers || Object.keys(app.answers).length === 0) && <p>No answers provided.</p>}
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2"><Button variant="destructive" onClick={() => handleApplicationAction('deny', app)} disabled={isLoading}>Deny</Button><Button onClick={() => handleApplicationAction('approve', app)} disabled={isLoading}>Approve</Button></div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="mentor" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Mentor Dashboard</CardTitle>
                        <CardDescription>Resources and tools for mentoring new Tribe Chiefs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">The Mentor dashboard is under construction. Check back soon for tools to help you guide new chiefs on their journey.</p>
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
    {userTribe && selectedMeeting && user && (
        <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} meeting={selectedMeeting} tribeId={userTribe.id} userId={user.uid} existingReport={meetingReports.find(r => r.meetingId === selectedMeeting.id)} onReportSubmitted={() => {setIsReportModalOpen(false); if (user) fetchTribesAndUserData(user);}} />
    )}
    </>
  );
}


export default function MyTribePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <MyTribePageContent />
    </Suspense>
  );
}
