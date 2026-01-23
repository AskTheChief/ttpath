

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
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
import { Terminal, Users, Loader2, Home, UserCheck, Shield, Trash2, User as UserIcon, Sparkles, FileText, Lock, Compass, Info, AlertTriangle, Inbox, Send, Mail, BookOpen, RefreshCw } from 'lucide-react';
import { createTribe } from '@/ai/flows/create-tribe';
import { joinTribe } from '@/ai/flows/join-tribe';
import { getTribes } from '@/ai/flows/get-tribes';
import { useLoadScript, Libraries, GoogleMap, MarkerF, MarkerClustererF } from '@react-google-maps/api';
import LocationAutocomplete from '@/components/location-autocomplete';
import type { Tribe, Meeting, Application, UserProfile, GetComprehensionTestOutput, TribeMember, MeetingReport, OutboundEmail, JournalEntry } from '@/lib/types';
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
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { resetUserProgress } from '@/ai/flows/reset-user-progress';
import EmailComposerModal from '@/components/modals/email-composer-modal';
import { getOutboxEmails } from '@/ai/flows/get-outbox-emails';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { saveJournalEntry, getJournalEntries, deleteJournalEntry } from '@/ai/flows/journal';


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

function ExplorerView({ user, isLoaded, isLoading, tribes, userTribe, newTribeName, newTribeLocation, newTribeCoords, selectedTribe, handlePlaceSelected, handleCreateTribe, handleJoinTribe, setNewTribeName, setSelectedTribe, pendingApplication, handleWithdrawApplication, handleTabChange }) {
  const tribeAppliedTo = tribes.find(t => t.id === pendingApplication?.tribeId);

  return (
    <>
        {pendingApplication ? (
            <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <Info className="h-4 w-4 !text-blue-600" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Application Pending</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                    Your application to join "{tribeAppliedTo?.name || 'a tribe'}" is awaiting review by the chief.
                    <Button onClick={() => handleWithdrawApplication(pendingApplication.id)} variant="destructive" size="sm" className="ml-4">Withdraw Application</Button>
                </AlertDescription>
            </Alert>
        ) : (
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
        )}
        <Card>
            <CardHeader>
                <CardTitle>Find an Existing Tribe</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative">
                <AllTribesMap
                    tribes={tribes}
                    selectedTribe={selectedTribe}
                    setSelectedTribe={setSelectedTribe}
                    handleJoinTribe={handleJoinTribe}
                    userTribe={userTribe}
                    isLoading={isLoading}
                    pendingApplication={pendingApplication}
                />
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

                <div className="border-t pt-4 mt-4 space-y-2">
                    <h4 className="font-semibold">Comprehension Test Requirement</h4>
                    <p className="text-sm text-muted-foreground">
                        Mentors review your test answers. The answers show your understanding of Tribe methods. This process helps you prepare for Tribe. You access the test on your 'My Profile & Test' tab. You write your answers and then you receive feedback from The Chief.
                    </p>
                    <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => handleTabChange('my-profile')}
                    >
                        Go to My Profile & Test
                    </Button>
                </div>
                
                <Button onClick={handleCreateTribe} className="w-full" disabled={isLoading || !!pendingApplication}>{isLoading ? 'Submitting Application...' : 'Apply to Create Tribe'}</Button>
            </CardContent>
        </Card>
    </>
  );
}

function AllTribesMap({ tribes, selectedTribe, setSelectedTribe, handleJoinTribe, userTribe, isLoading, pendingApplication }) {
    return (
        <div className="relative">
            <div style={overviewMapContainerStyle}>
                <GoogleMap
                    mapContainerStyle={{ height: '100%', width: '100%' }}
                    center={defaultCenter}
                    zoom={1}
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
                            {handleJoinTribe && (
                                <Button className="w-full mt-4" onClick={() => handleJoinTribe(selectedTribe.id)} disabled={!!userTribe || isLoading || !!pendingApplication}>
                                     {pendingApplication ? 'Application Pending' : 'Apply to Join'}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

function MyTribePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
  const [joinApplications, setJoinApplications] = useState<Application[]>([]);
  const [tribeCreationApps, setTribeCreationApps] = useState<Application[]>([]);
  const [pendingApplication, setPendingApplication] = useState<Application | null>(null);
  const [meetingReports, setMeetingReports] = useState<MeetingReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingAnswers, setIsFetchingAnswers] = useState(false);
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmPm] = useState('PM');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedReport, setSelectedReport] = useState<MeetingReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [outbox, setOutbox] = useState<OutboundEmail[]>([]);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<{email: string, name: string}[]>([]);
  
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [newEntryContent, setNewEntryContent] = useState('');
  const [isJournalLoading, setIsJournalLoading] = useState(false);


  useEffect(() => {
    // This effect runs only on the client
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const activeTabFromUrl = searchParams.get('view');
  const activeTab = activeTabFromUrl || (userLevel < 4 ? 'find-or-start-tribe' : 'my-profile');

  const { toast } = useToast();
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const isChief = userTribe && userTribe.chief === user?.uid;
  const isMentor = userLevel >= 6;

  const handleTabChange = (value: string) => {
    router.push(`/my-tribe?view=${value}`, { scroll: false });
  };

  const fetchOutbox = useCallback(async () => {
    if (!user?.email) return;
    setIsEmailLoading(true);
    try {
        const outboxEmails = await getOutboxEmails();
        setOutbox(outboxEmails);
    } catch (e: any) {
        toast({ title: "Error fetching outbox", description: e.message, variant: "destructive" });
    } finally {
        setIsEmailLoading(false);
    }
  }, [user, toast]);

  const fetchJournal = useCallback(async () => {
    if (!user) return;
    setIsJournalLoading(true);
    try {
        const idToken = await user.getIdToken();
        const entries = await getJournalEntries({ idToken });
        setJournalEntries(entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e: any) {
        toast({ title: "Error fetching journal", description: e.message, variant: "destructive" });
    } finally {
        setIsJournalLoading(false);
    }
  }, [user, toast]);
  
  
  useEffect(() => {
      if (activeTab === 'email' && user) {
          fetchOutbox();
      }
      if (activeTab === 'journal' && user) {
        fetchJournal();
      }
  }, [activeTab, user, fetchOutbox, fetchJournal]);


  const fetchTribesAndUserData = useCallback(async (currentUser: User) => {
    try {
      setIsLoading(true);
      const idToken = await currentUser.getIdToken();
      
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        myAccountVisits: increment(1)
      }).catch(err => console.log("Could not update last login, probably a new user."));


      const [progress, allTribes, profile, myPendingAppsResult] = await Promise.all([
        getUserProgress({ idToken }),
        getTribes({}),
        getUserProfile({ idToken }),
        manageApplication({ action: 'get', type: 'my_pending', idToken }),
      ]);

      setUserLevel(progress.currentUserLevel);
      setUserProfile(profile);
      
      if (myPendingAppsResult.success && myPendingAppsResult.applications && myPendingAppsResult.applications.length > 0) {
        setPendingApplication(myPendingAppsResult.applications[0]);
      } else {
        setPendingApplication(null);
      }


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
              setJoinApplications(sortedApps);
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
      if (currentUser) {
        setUser(currentUser);
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
        router.push('/'); // Redirect to home if not logged in
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchTribesAndUserData, toast, router]);

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

  const handleWithdrawApplication = async (applicationId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
        const idToken = await user.getIdToken();
        const result = await manageApplication({
            action: 'withdraw',
            applicationId,
            type: 'join_tribe', // Assuming only join_tribe can be withdrawn by user for now
            idToken
        });
        if (result.success) {
            toast({ title: 'Application Withdrawn', description: 'Your application has been successfully withdrawn.' });
            fetchTribesAndUserData(user); // Refresh data
        } else {
            throw new Error(result.message || 'Failed to withdraw application.');
        }
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };


  const handleLeaveTribe = async (tribeId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      await leaveTribe(tribeId, user.uid);
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { currentUserLevel: 3 }, { merge: true });
      toast({ title: 'Left Tribe', description: 'You have successfully left the tribe. Refreshing your data...' });
      
      // Force a full refresh of user data to resync state
      window.location.reload();

    } catch (error) {
      console.error("Error leaving tribe: ", error);
      toast({ title: 'Error', description: 'Failed to leave tribe.', variant: 'destructive' });
      setIsLoading(false);
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

  const handleResetProgress = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Authenticated",
        description: "You must be logged in to reset progress.",
      });
      return;
    }

    try {
      const idToken = await user.getIdToken();
      await resetUserProgress({ idToken });
      toast({
        title: "Progress Reset",
        description: "Your progress has been reset back to the Explorer stage. The page will now reload.",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Resetting Progress",
        description: error.message,
      });
    }
  };

  const openComposerForChief = async () => {
    if (!userTribe) return;
    const chief = tribeMembers.find(m => m.uid === userTribe.chief);
    if (chief?.email) {
        setEmailRecipients([{ email: chief.email, name: `${chief.firstName} ${chief.lastName}` }]);
        setIsEmailModalOpen(true);
    } else {
        toast({ title: "Chief's email not found", variant: "destructive" });
    }
  };

  const openComposerForMembers = async () => {
    const memberRecipients = tribeMembers.map(m => ({ email: m.email, name: `${m.firstName} ${m.lastName}` }));
    setEmailRecipients(memberRecipients);
    setIsEmailModalOpen(true);
  };
  
  const openComposerForSingleMember = (member: TribeMember) => {
    if (member.email) {
      setEmailRecipients([{ email: member.email, name: `${member.firstName} ${member.lastName}` }]);
      setIsEmailModalOpen(true);
    } else {
      toast({ title: "Member's email not found", variant: "destructive" });
    }
  };
  
  const handleSaveJournalEntry = async () => {
    if (!newEntryContent.trim()) {
      toast({ title: 'Entry is empty', variant: 'destructive' });
      return;
    }
    if (!user) return;
    
    setIsJournalLoading(true);
    try {
      const idToken = await user.getIdToken();
      await saveJournalEntry({ entryContent: newEntryContent, idToken });
      setNewEntryContent('');
      toast({ title: 'Journal Entry Saved' });
      fetchJournal(); // Refresh journal entries
    } catch(e: any) {
      toast({ title: "Error Saving Entry", description: e.message, variant: 'destructive' });
    } finally {
      setIsJournalLoading(false);
    }
  };

  const handleDeleteJournalEntry = async (entryId: string) => {
    if (!user) return;
    setIsJournalLoading(true);
    try {
        const idToken = await user.getIdToken();
        await deleteJournalEntry({ entryId, idToken });
        toast({ title: 'Entry Deleted' });
        fetchJournal();
    } catch (e: any) {
        toast({ title: 'Error Deleting Entry', description: e.message, variant: 'destructive' });
    } finally {
        setIsJournalLoading(false);
    }
  };

  if (isLoading || !isLoaded || !currentTime || !user) {
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
        <TabsTrigger value={value} disabled={!isUnlocked} className={cn("text-base", !isUnlocked && 'text-muted-foreground/50 cursor-not-allowed')}>
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

  const renderJournalView = () => (
     <div className="m-0 space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>New Journal Entry</CardTitle>
                <CardDescription>
                  This tool supports your personal growth. You record your thoughts and feelings. A mentor may offer feedback.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Textarea 
                    placeholder="Start writing..."
                    rows={8}
                    value={newEntryContent}
                    onChange={(e) => setNewEntryContent(e.target.value)}
                    disabled={isJournalLoading}
                />
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveJournalEntry} disabled={isJournalLoading || !newEntryContent.trim()}>
                    {isJournalLoading && newEntryContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Save Entry
                </Button>
            </CardFooter>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Your Past Entries</CardTitle>
                <CardDescription>Review and reflect on your journey.</CardDescription>
            </CardHeader>
            <CardContent>
                {isJournalLoading && journalEntries.length === 0 ? (
                    <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
                ) : journalEntries.length === 0 ? (
                    <p className="text-center text-muted-foreground p-8">You have no journal entries yet.</p>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {journalEntries.map(entry => (
                            <AccordionItem key={entry.id} value={entry.id}>
                                <div className="flex items-center w-full p-4">
                                    <AccordionTrigger className="flex-grow p-0">
                                        <div className="flex flex-col items-start text-left">
                                            <span className="font-semibold">Entry from {format(new Date(entry.createdAt), 'PPP p')}</span>
                                            <p className="text-sm text-muted-foreground truncate w-full max-w-lg">{entry.entryContent}</p>
                                        </div>
                                    </AccordionTrigger>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="ml-4 flex-shrink-0 h-8 w-8">
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteJournalEntry(entry.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                                <AccordionContent>
                                    <p className="whitespace-pre-wrap">{entry.entryContent}</p>
                                    {entry.feedback && entry.feedback.length > 0 && (
                                      <div className="mt-6 space-y-4">
                                          <h4 className="font-semibold text-md">Feedback from Mentors</h4>
                                          {entry.feedback.map((fb, index) => (
                                              <Alert key={index} className="bg-muted/50">
                                                  <UserIcon className="h-4 w-4" />
                                                  <AlertTitle>Feedback from {fb.mentorName}</AlertTitle>
                                                  <AlertDescription>
                                                      <p className="whitespace-pre-wrap">{fb.feedbackContent}</p>
                                                      <p className="text-xs text-muted-foreground mt-2">{format(new Date(fb.createdAt), 'PPP p')}</p>
                                                  </AlertDescription>
                                              </Alert>
                                          ))}
                                      </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    </div>
  );

  const renderMemberChiefView = () => (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6 h-auto p-1">
            <TabsTrigger value="my-profile" className="text-base">My Profile</TabsTrigger>
            {renderLockedTabTrigger("my-tribe", "My Tribe", 4)}
            {renderLockedTabTrigger("journal", "My Journal", 2)}
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
            <Card>
              <CardHeader>
                  <CardTitle>Reset Me to Explorer</CardTitle>
                  <CardDescription>This action resets your journey back to the Explorer stage, allowing you to join a different tribe or start a new one.</CardDescription>
              </CardHeader>
              <CardContent>
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="outline">
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Reset My Progress
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  This is a permanent action. It will reset your progress to the "Explorer" stage, remove you from your current tribe, and clear any chief responsibilities. Are you sure you want to continue?
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleResetProgress}>Yes, Reset My Progress</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
              </CardContent>
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
                <CardFooter className="flex flex-col sm:flex-row gap-2">
                    {isChief ? null : (
                         <Button onClick={openComposerForChief} className="w-full sm:w-auto"><Mail className="mr-2 h-4 w-4" />Email Your Chief</Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="outline" className="w-full sm:w-auto sm:ml-auto">Leave Tribe</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure you want to leave this tribe?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  This action will remove you from the tribe. You will need to re-apply if you wish to join again.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleLeaveTribe(userTribe.id)}>Yes, Leave Tribe</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>All Existing Tribes</CardTitle>
                        <CardDescription>A global map of all active tribes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <AllTribesMap
                            tribes={tribes}
                            selectedTribe={selectedTribe}
                            setSelectedTribe={setSelectedTribe}
                            userTribe={userTribe}
                            isLoading={isLoading}
                            pendingApplication={pendingApplication}
                        />
                    </CardContent>
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
        
        <TabsContent value="journal" className="m-0">
          {renderJournalView()}
        </TabsContent>
        
        {isChief && userTribe && (
            <TabsContent value="chief-dashboard" className="m-0 space-y-8">
                 <Card>
                    <CardHeader>
                    <CardTitle>Manage Meetings</CardTitle><CardDescription>Schedule and view meetings for your tribe.</CardDescription>
                    <p className="text-sm font-semibold pt-2">Current Time: {currentTime?.toLocaleTimeString()}</p>
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
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Users />Tribe Members</CardTitle>
                            <CardDescription>As Chief, you can view member details and their test answers.</CardDescription>
                        </div>
                        <Button onClick={openComposerForMembers}><Mail className="mr-2 h-4 w-4" />Email All Members</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                    {tribeMembers.map(member => (
                        <AccordionItem key={member.uid} value={member.uid}>
                        <AccordionTrigger>{member.uid === userTribe.chief ? 'Chief: ' : ''}{member.firstName} {member.lastName}</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm"><span className="font-semibold">Email:</span> {member.email}</p>
                                  <p className="text-sm"><span className="font-semibold">Phone:</span> {member.phone}</p>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => openComposerForSingleMember(member)}>
                                  <Mail className="mr-2 h-4 w-4" /> Email Member
                                </Button>
                              </div>
                            <div>
                              <p className="text-sm"><span className="font-semibold">Issue:</span> {member.issue || 'Not specified'}</p>
                              <p className="text-sm"><span className="font-semibold">Service Project:</span> {member.serviceProject || 'Not specified'}</p>
                            </div>
                            {member.answers && (
                                <div>
                                <h4 className="font-semibold mb-2">Comprehension Test Answers</h4>
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
                {joinApplications && joinApplications.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>Pending Applications</CardTitle><CardDescription>Review and respond to applicants for your tribe.</CardDescription></CardHeader>
                    <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {joinApplications.map(app => (
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
    <Tabs defaultValue="find-or-start-tribe" className="w-full" onValueChange={handleTabChange} value={activeTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6 h-auto p-1">
            <TabsTrigger value="find-or-start-tribe" className="text-base">Find or Start a Tribe</TabsTrigger>
            <TabsTrigger value="my-profile" className="text-base">My Profile &amp; Test</TabsTrigger>
            {renderLockedTabTrigger("journal", "My Journal", 2)}
        </TabsList>
        <TabsContent value="find-or-start-tribe" className="m-0 space-y-8">
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
              pendingApplication={pendingApplication}
              handleWithdrawApplication={handleWithdrawApplication}
              handleTabChange={handleTabChange}
            />
        </TabsContent>
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
        <TabsContent value="journal" className="m-0">
          {renderJournalView()}
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

      {isEmailModalOpen && (
          <EmailComposerModal
              isOpen={isEmailModalOpen}
              onClose={() => setIsEmailModalOpen(false)}
              recipientEmails={emailRecipients.map(r => r.email)}
              recipientNames={emailRecipients.map(r => r.name)}
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

    
