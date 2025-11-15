
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { leaveTribe } from '@/lib/tribes';
import { getComprehensionTest } from '@/ai/flows/get-comprehension-test';
import { comprehensionQuestions } from '@/lib/data';
import { saveComprehensionTest } from '@/ai/flows/save-comprehension-test';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Users, Loader2, Home, UserCheck, Shield, Trash2, User as UserIcon, Sparkles, FileText, Lock, Compass } from 'lucide-react';
import { createTribe } from '@/ai/flows/create-tribe';
import { joinTribe } from '@/ai/flows/join-tribe';
import { getTribes } from '@/ai/flows/get-tribes';
import { useLoadScript, Libraries, GoogleMap, MarkerF, MarkerClustererF } from '@react-google-maps/api';
import LocationAutocomplete from '@/components/location-autocomplete';
import type { Tribe, Meeting, Application, UserProfile, GetComprehensionTestOutput, TribeMember, MeetingReport } from '@/lib/types';
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
import { evaluateComprehensionTest } from '@/ai/flows/evaluate-comprehension-test';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { getUserProgress } from '@/ai/flows/get-user-progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const libraries: Libraries = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

const overviewMapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '0.5rem',
}

const defaultCenter = {
    lat: 20,
    lng: -30,
};

function ExplorerView({ user, isLoaded, isLoading, tribes, userTribe, newTribeName, newTribeLocation, newTribeCoords, selectedTribe, handlePlaceSelected, handleCreateTribe, handleJoinTribe, setNewTribeName, setSelectedTribe }) {
  return (
    <>
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Instructions</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>To join a tribe:</b> Use the map below to find a tribe in your area. Click on a marker to see details and apply to join. This will send an application to the Tribe Chief for their review.</li>
              <li><b>To start a tribe:</b> If there are no tribes nearby or you wish to lead your own, fill out the "Start Your Own Tribe" form. A Mentor will review your application.</li>
              <li>Completing either of these steps will unlock the next stage of your journey.</li>
            </ul>
          </AlertDescription>
        </Alert>
        <Card>
            <CardHeader>
                <CardTitle>Find an Existing Tribe</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative">
                <div style={overviewMapContainerStyle}>
                    <GoogleMap
                    mapContainerStyle={{ height: '100%', width: '100%' }}
                    center={defaultCenter}
                    zoom={2}
                    options={{ disableDefaultUI: true, zoomControl: true }}
                    onClick={() => setSelectedTribe(null)}
                    >
                    <MarkerClustererF>
                        {(clusterer) =>
                        tribes.filter(t => t.lat && t.lng).map(tribe => (
                        <MarkerF
                            key={tribe.id}
                            position={{ lat: tribe.lat!, lng: tribe.lng! }}
                            clusterer={clusterer}
                            onClick={() => setSelectedTribe(tribe)}
                        />
                        ))
                        }
                    </MarkerClustererF>
                    </GoogleMap>
                </div>
                {selectedTribe && (
                    <div className="absolute top-4 right-4 w-full max-w-sm z-10">
                    <Card>
                        <CardHeader>
                        <CardTitle>{selectedTribe.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                        <p className="text-muted-foreground">{selectedTribe.location}</p>
                        <p className="text-sm text-muted-foreground">{selectedTribe.members.length} members</p>
                        <Button className="w-full mt-4" onClick={() => handleJoinTribe(selectedTribe.id)} disabled={!!userTribe || isLoading}>
                            Apply to Join
                        </Button>
                        </CardContent>
                    </Card>
                    </div>
                )}
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Start Your Own Tribe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="tribe-name-chief">Tribe Name</Label><Input id="tribe-name-chief" value={newTribeName} onChange={(e) => setNewTribeName(e.target.value)} placeholder="Enter tribe name" /></div>
                <div className="space-y-2">
                <Label htmlFor="tribe-location-chief">Location</Label>
                <LocationAutocomplete id="tribe-location-chief" onPlaceSelected={handlePlaceSelected} placeholder="e.g., 123 Main St, Anytown, USA" disabled={!isLoaded} initialValue={newTribeLocation} />
                <p className="text-sm text-muted-foreground pt-1">Enter your house number, street, city, and state. Click your address from the dropdown when you see it.</p>
                <div className="mt-2">
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={newTribeCoords || defaultCenter} zoom={newTribeCoords ? 12 : 2} options={{ disableDefaultUI: true, zoomControl: true }} >
                        {newTribeCoords && <MarkerF position={newTribeCoords} />}
                    </GoogleMap>
                </div>
                </div>
                <Button onClick={handleCreateTribe} className="w-full" disabled={isLoading}>{isLoading ? 'Submitting Application...' : 'Apply to Create Tribe'}</Button>
            </CardContent>
        </Card>
    </>
  );
}

function MyTribePageContent() {
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [userLevel, setUserLevel] = useState(1);
  const [userProfile, setUserProfile] = useState<Partial<UserProfile>>({});
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [newTribeName, setNewTribeName] = useState('');
  const [newTribeLocation, setNewTribeLocation] = useState('');
  const [newTribeCoords, setNewTribeCoords] = useState<{lat: number; lng: number} | null>(null);
  const [userTribe, setUserTribe] = useState<Tribe | null>(null);
  const [tribeMembers, setTribeMembers] = useState<TribeMember[]>([]);
  const [comprehensionTestData, setComprehensionTestData] = useState<GetComprehensionTestOutput>({ answers: {} });
  const [applications, setApplications] = useState<Application[]>([]);
  const [tribeCreationApps, setTribeCreationApps] = useState<Application[]>([]);
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
  const [selectedReport, setSelectedReport] = useState<MeetingReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const { toast } = useToast();
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const isChief = userTribe && userTribe.chief === user?.uid;
  const isMentor = userLevel >= 6;

  const fetchTribesAndUserData = useCallback(async (currentUser: User) => {
    try {
      setIsLoading(true);
      const idToken = await currentUser.getIdToken();
      
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        myAccountVisits: increment(1)
      }).catch(err => console.log("Could not update last login, probably a new user."));


      const [progress, allTribes, profile] = await Promise.all([
        getUserProgress({ idToken }),
        getTribes({}),
        getUserProfile({ idToken }),
      ]);

      setUserLevel(progress.currentUserLevel);
      setUserProfile(profile);

      const tribesWithMembers = allTribes.map(t => ({
        ...t,
        members: t.members || [],
        meetings: t.meetings?.map(m => ({ ...m, date: new Date(m.date) })) || []
      }));

      setTribes(tribesWithMembers as Tribe[]);
      const currentUserTribe = (tribesWithMembers as Tribe[]).find(tribe => tribe.members.includes(currentUser.uid));
      setUserTribe(currentUserTribe || null);
      
      // Fetch role-specific data
      if (progress.currentUserLevel >= 6) { // Mentor
          const newTribeAppsResult = await manageApplication({ action: 'get', type: 'new_tribe', idToken });
          if (newTribeAppsResult.success && newTribeAppsResult.applications) {
              setTribeCreationApps(newTribeAppsResult.applications);
          }
      }
      if (progress.currentUserLevel >= 5 && currentUserTribe?.chief === currentUser.uid) { // Chief
          const joinAppsResult = await manageApplication({ action: 'get', type: 'join_tribe', idToken });
          if (joinAppsResult.success && joinAppsResult.applications) {
              const sortedApps = joinAppsResult.applications.map(app => ({
                  ...app,
                  createdAt: new Date(app.createdAt),
              })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
              setApplications(sortedApps);
          }
      }
      if (currentUserTribe) { // Member or Chief of a tribe
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

    } catch (error: any) {
        console.error("Error fetching page data: ", error);
        toast({ title: 'Error', description: error.message || 'Could not load your tribe and comprehension test data.', variant: 'destructive' });
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
            const data = await getComprehensionTest({ idToken });
            setComprehensionTestData(data);
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
        setComprehensionTestData({ answers: {} });
        setApplications([]);
        setTribeCreationApps([]);
        setUserProfile({});
        setUserLevel(1);
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
        toast({ title: 'Application Submitted', description: result.message });
        setNewTribeName('');
        setNewTribeLocation('');
        setNewTribeCoords(null);
        if (user) fetchTribesAndUserData(user); // Refresh data
      } else {
        throw new Error(result.message || 'Failed to create tribe application.');
      }
    } catch (error: any) {
      console.error("Error creating tribe application: ", error);
      toast({ title: 'Error', description: error.message || 'Failed to create tribe application.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleJoinTribe = async (tribeId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const userAnswersData = await getComprehensionTest({ idToken });
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
    setComprehensionTestData(prev => ({...prev, answers: { ...prev.answers, [question]: value }}));
  };

  const handleSaveAnswers = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      await saveComprehensionTest({ answers: comprehensionTestData.answers, idToken });
      toast({ title: 'Success', description: 'Your comprehension test answers have been saved.' });
    } catch (error) {
      console.error("Error saving comprehension test answers: ", error);
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
            type: application.type,
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

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setUserProfile(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleMeetingReportAction = (meeting: Meeting, report?: MeetingReport) => {
    setSelectedMeeting(meeting);
    setSelectedReport(report || null);
    setIsReportModalOpen(true);
  };

  const handleReceiveFeedback = async () => {
    if (!user) return;
    setIsEvaluating(true);
    try {
        const idToken = await user.getIdToken();
        const evaluation = await evaluateComprehensionTest({ answers: comprehensionTestData.answers, idToken });
        
        setComprehensionTestData(prev => ({
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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-2xl font-semibold mt-4">Loading Your Account...</div>
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

  const now = new Date();
  const upcomingMeetings = (userTribe?.meetings || [])
    .filter(m => new Date(m.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const pastMeetings = (userTribe?.meetings || [])
    .filter(m => new Date(m.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const meetingDates = userTribe?.meetings?.map(m => new Date(m.date)) || [];
  
  const renderLockedTabTrigger = (value: string, title: string, requiredLevel: number) => {
    const isUnlocked = userLevel >= requiredLevel;
    const tooltipContent = `Requires Level ${requiredLevel} (${{4: 'Member', 5: 'Chief', 6: 'Mentor'}[requiredLevel]}).`;
    
    const Trigger = (
        <TabsTrigger value={value} disabled={!isUnlocked} className={cn(!isUnlocked && 'text-muted-foreground/50 cursor-not-allowed')}>
            {title}
            {!isUnlocked && <Lock className="h-3 w-3 ml-2" />}
        </TabsTrigger>
    );

    if (isUnlocked) {
        return Trigger;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {/* The div wrapper is necessary for Tooltip with disabled elements */}
                    <div>{Trigger}</div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipContent}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

  const renderMemberChiefView = () => (
    <Tabs defaultValue="my-tribe" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6 h-auto p-1">
            <TabsTrigger value="my-profile">My Profile</TabsTrigger>
            {renderLockedTabTrigger("my-tribe", "My Tribe", 4)}
            {renderLockedTabTrigger("chief-dashboard", "Chief Dashboard", 5)}
            {renderLockedTabTrigger("mentor-dashboard", "Mentor Dashboard", 6)}
        </TabsList>

        <TabsContent value="my-profile" className="m-0 space-y-8">
            <Card>
                <CardHeader>
                  <CardTitle>My Profile</CardTitle>
                  <CardDescription>View and update your personal information.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSaveProfile}>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="firstName">First Name</Label><Input id="firstName" value={userProfile.firstName || ''} onChange={handleProfileChange} /></div>
                            <div className="space-y-2"><Label htmlFor="lastName">Last Name</Label><Input id="lastName" value={userProfile.lastName || ''} onChange={handleProfileChange} /></div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="address">Address</Label><Input id="address" value={userProfile.address || ''} onChange={handleProfileChange} /></div>
                        <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" value={userProfile.phone || ''} onChange={handleProfileChange} /></div>
                        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={userProfile.email || ''} disabled /></div>
                        <div className="space-y-2"><Label htmlFor="issue">Your Issue</Label><Textarea id="issue" value={userProfile.issue || ''} onChange={handleProfileChange} placeholder="The main thing you want to transform..." /></div>
                        <div className="space-y-2"><Label htmlFor="serviceProject">Your Service Project</Label><Textarea id="serviceProject" value={userProfile.serviceProject || ''} onChange={handleProfileChange} placeholder="How you identify your role in the community..." /></div>
                    </CardContent>
                    <CardFooter><Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Profile'}</Button></CardFooter>
                </form>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Comprehension Test</CardTitle>
                    <CardDescription>Review or update your answers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                {isFetchingAnswers ? (<p>Loading your answers...</p>) : (
                comprehensionQuestions.map((q, i) => (
                <div key={i} className="grid w-full gap-1.5">
                    <Label htmlFor={`question-${i}`}>{i + 1}. {q}</Label>
                    <Textarea id={`question-${i}`} rows={5} value={comprehensionTestData.answers[q] || ''} onChange={(e) => handleAnswerChange(q, e.target.value)} placeholder="Your answer..." disabled={isLoading || isEvaluating} />
                </div>
                ))
                )}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 justify-end">
                <Button onClick={handleSaveAnswers} variant="secondary" disabled={isLoading || isEvaluating}>{isLoading ? 'Saving...' : 'Save Answers'}</Button>
                <Button onClick={handleReceiveFeedback} disabled={isLoading || isEvaluating}>{isEvaluating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating...</> : 'Receive Feedback'}</Button>
                </CardFooter>
                {comprehensionTestData.latestFeedback && (
                <CardContent>
                <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle className="flex justify-between">
                    <span>You Receive Guidance</span>
                    <span className="text-sm font-normal text-muted-foreground">{new Date(comprehensionTestData.latestFeedback.createdAt).toLocaleString()}</span>
                    </AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap">{comprehensionTestData.latestFeedback.feedback}</AlertDescription>
                </Alert>
                </CardContent>
                )}
            </Card>
        </TabsContent>
        
        <TabsContent value="my-tribe" className="m-0 space-y-8">
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
                      <Accordion type="single" collapsible className="w-full">
                        {pastMeetings.map(meeting => {
                          const reportsForMeeting = meetingReports.filter(r => r.meetingId === meeting.id);
                          const userReport = reportsForMeeting.find(r => r.userId === user?.uid);

                          return (
                            <AccordionItem key={meeting.id} value={meeting.id}>
                              <div className="flex items-center w-full p-4">
                                <AccordionTrigger className="flex-grow p-0">
                                    <span className="font-semibold">{format(new Date(meeting.date), 'PPP')}</span>
                                </AccordionTrigger>
                                <Button variant="secondary" size="sm" className="ml-4" onClick={() => handleMeetingReportAction(meeting, userReport)}>
                                  {userReport ? 'View My Report' : 'Submit My Report'}
                                </Button>
                              </div>
                              <AccordionContent>
                                <div className="space-y-2 pl-4">
                                  <h4 className="font-semibold text-sm">Submitted Reports:</h4>
                                  {reportsForMeeting.length > 0 ? (
                                    reportsForMeeting.map(report => (
                                      <Button key={report.id} variant="link" className="p-0 h-auto justify-start" onClick={() => handleMeetingReportAction(meeting, report)}>
                                        <FileText className="h-4 w-4 mr-2" /> Report from {report.userName}
                                      </Button>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No reports submitted for this meeting.</p>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    ) : (
                      <p className="text-sm text-muted-foreground">No past meetings.</p>
                    )}
                </CardContent>
                </Card>
            </>
            ) : (
            <Card>
              <CardHeader>
                  <CardTitle>You Are Not in a Tribe</CardTitle>
                  <CardDescription>Go to the explorer page to find and apply for a tribe or start your own.</CardDescription>
              </CardHeader>
            </Card>
            )}
        </TabsContent>
        
        {isChief && userTribe && (
            <TabsContent value="chief-dashboard" className="m-0 space-y-8">
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
                          <div className="flex w-full items-center gap-1">
                              <Select value={hour} onValueChange={setHour}>
                                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                  <SelectContent>{Array.from({length: 12}, (_, i) => i + 1).map(h => <SelectItem key={h} value={String(h)}>{String(h)}</SelectItem>)}</SelectContent>
                              </Select>
                              <span>:</span>
                              <Select value={minute} onValueChange={setMinute}>
                                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="00">00</SelectItem>
                                      <SelectItem value="30">30</SelectItem>
                                  </SelectContent>
                              </Select>
                              <Select value={ampm} onValueChange={setAmPm}>
                                  <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
                              </Select>
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
                            <div>
                              <p className="text-sm"><span className="font-semibold">Issue:</span> {member.issue || 'Not specified'}</p>
                              <p className="text-sm"><span className="font-semibold">Service Project:</span> {member.serviceProject || 'Not specified'}</p>
                            </div>
                            {member.answers && (
                                <div>
                                <h4 className="font-semibold mb-2">Comprehension Answers</h4>
                                <div className="space-y-3 text-sm p-3 border rounded-md max-h-60 overflow-y-auto bg-muted/50">
                                    {comprehensionQuestions.map((q, i) => (<div key={i}><p className="font-medium">{i + 1}. {q}</p><p className="text-muted-foreground whitespace-pre-wrap">{member.answers?.[q] || "No answer provided."}</p></div>))}
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
                                <p className="text-sm"><span className="font-semibold">Issue:</span> {app.issue || 'Not specified'}</p>
                                <p className="text-sm"><span className="font-semibold">Service Project:</span> {app.serviceProject || 'Not specified'}</p>
                                </div>
                                <div>
                                <h4 className="font-semibold mb-2">Comprehension Test Answers</h4>
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
            </TabsContent>
        )}

        {isMentor && (
            <TabsContent value="mentor-dashboard" className="m-0">
                <Card>
                    <CardHeader>
                        <CardTitle>Mentor Dashboard</CardTitle>
                        <CardDescription>Review applications from members who want to start their own tribe.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {tribeCreationApps.length > 0 ? (
                              <Accordion type="single" collapsible className="w-full">
                              {tribeCreationApps.map(app => (
                              <AccordionItem key={app.id} value={app.id}>
                                  <AccordionTrigger><div className="flex flex-col items-start"><span>{app.applicantName} - {app.tribeName}</span><span className="text-xs text-muted-foreground">{new Date(app.createdAt).toLocaleString()}</span></div></AccordionTrigger>
                                  <AccordionContent>
                                  <div className="space-y-4">
                                      <div><h4 className="font-semibold mb-2">Applicant & Tribe Info</h4><div className="text-sm space-y-1"><p><span className="font-medium">Email:</span> {app.applicantEmail || 'N/A'}</p><p><span className="font-medium">Phone:</span> {app.applicantPhone || 'N/A'}</p><p><span className="font-medium">Proposed Location:</span> {app.location || 'N/A'}</p></div></div>
                                      <div>
                                      <p className="text-sm"><span className="font-semibold">Issue:</span> {app.issue || 'Not specified'}</p>
                                      <p className="text-sm"><span className="font-semibold">Service Project:</span> {app.serviceProject || 'Not specified'}</p>
                                      </div>
                                      <div>
                                      <h4 className="font-semibold mb-2">Comprehension Test Answers</h4>
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
                        ) : (
                            <p className="text-muted-foreground">There are currently no pending applications to create a new tribe.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        )}
    </Tabs>
  );

  const renderExplorerView = () => (
    <Tabs defaultValue="next-step" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-auto p-1">
            <TabsTrigger value="next-step">Find or Start a Tribe</TabsTrigger>
            <TabsTrigger value="profile-comprehension-test">My Profile &amp; Comprehension Test</TabsTrigger>
        </TabsList>
        <TabsContent value="next-step" className="m-0 space-y-8">
             <ExplorerView 
              user={user}
              isLoaded={isLoaded}
              isLoading={isLoading}
              tribes={tribes}
              userTribe={userTribe}
              newTribeName={newTribeName}
              newTribeLocation={newTribeLocation}
              newTribeCoords={newTribeCoords}
              selectedTribe={selectedTribe}
              handlePlaceSelected={handlePlaceSelected}
              handleCreateTribe={handleCreateTribe}
              handleJoinTribe={handleJoinTribe}
              setNewTribeName={setNewTribeName}
              setSelectedTribe={setSelectedTribe}
            />
        </TabsContent>
        <TabsContent value="profile-comprehension-test" className="m-0 space-y-8">
            <Card>
                <CardHeader>
                  <CardTitle>My Profile</CardTitle>
                  <CardDescription>View and update your personal information.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSaveProfile}>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="firstName">First Name</Label><Input id="firstName" value={userProfile.firstName || ''} onChange={handleProfileChange} /></div>
                            <div className="space-y-2"><Label htmlFor="lastName">Last Name</Label><Input id="lastName" value={userProfile.lastName || ''} onChange={handleProfileChange} /></div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="address">Address</Label><Input id="address" value={userProfile.address || ''} onChange={handleProfileChange} /></div>
                        <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" value={userProfile.phone || ''} onChange={handleProfileChange} /></div>
                        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={userProfile.email || ''} disabled /></div>
                        <div className="space-y-2"><Label htmlFor="issue">Your Issue</Label><Textarea id="issue" value={userProfile.issue || ''} onChange={handleProfileChange} placeholder="The main thing you want to transform..." /></div>
                        <div className="space-y-2"><Label htmlFor="serviceProject">Your Service Project</Label><Textarea id="serviceProject" value={userProfile.serviceProject || ''} onChange={handleProfileChange} placeholder="How you identify your role in the community..." /></div>
                    </CardContent>
                    <CardFooter><Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Profile'}</Button></CardFooter>
                </form>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Comprehension Test</CardTitle>
                    <CardDescription>Review or update your answers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                {isFetchingAnswers ? (<p>Loading your answers...</p>) : (
                comprehensionQuestions.map((q, i) => (
                <div key={i} className="grid w-full gap-1.5">
                    <Label htmlFor={`question-${i}`}>{i + 1}. {q}</Label>
                    <Textarea id={`question-${i}`} rows={5} value={comprehensionTestData.answers[q] || ''} onChange={(e) => handleAnswerChange(q, e.target.value)} placeholder="Your answer..." disabled={isLoading || isEvaluating} />
                </div>
                ))
                )}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 justify-end">
                <Button onClick={handleSaveAnswers} variant="secondary" disabled={isLoading || isEvaluating}>{isLoading ? 'Saving...' : 'Save Answers'}</Button>
                <Button onClick={handleReceiveFeedback} disabled={isLoading || isEvaluating}>{isEvaluating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating...</> : 'Receive Feedback'}</Button>
                </CardFooter>
                {comprehensionTestData.latestFeedback && (
                <CardContent>
                <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle className="flex justify-between">
                    <span>You Receive Guidance</span>
                    <span className="text-sm font-normal text-muted-foreground">{new Date(comprehensionTestData.latestFeedback.createdAt).toLocaleString()}</span>
                    </AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap">{comprehensionTestData.latestFeedback.feedback}</AlertDescription>
                </Alert>
                </CardContent>
                )}
            </Card>
        </TabsContent>
    </Tabs>
  );


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

        {userLevel < 4 ? renderExplorerView() : renderMemberChiefView()}

      </div>
      
      {userTribe && selectedMeeting && user && (
          <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            meeting={selectedMeeting}
            tribeId={userTribe.id}
            userId={user.uid}
            existingReport={selectedReport || meetingReports.find(r => r.meetingId === selectedMeeting.id && r.userId === user.uid)}
            onReportSubmitted={() => {
              setIsReportModalOpen(false);
              if (user) fetchTribesAndUserData(user);
            }}
          />
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
