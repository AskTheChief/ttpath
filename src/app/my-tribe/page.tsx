'use client';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { leaveTribe } from '@/lib/tribes';
import { getAlignmentTest } from '@/ai/flows/get-alignment-test';
import { comprehensionQuestions } from '@/lib/data';
import { saveAlignmentTest } from '@/ai/flows/save-alignment-test';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Users, Loader2, Home, UserCheck, Shield, Trash2, User as UserIcon, Sparkles, FileText, Lock, Compass, Info, AlertTriangle, Inbox, Send, Mail, BookOpen, RefreshCw, BookHeart, Edit, Bold, Italic, Underline } from 'lucide-react';
import { createTribe } from '@/ai/flows/create-tribe';
import { joinTribe } from '@/ai/flows/join-tribe';
import { getTribes } from '@/ai/flows/get-tribes';
import { useLoadScript, Libraries, GoogleMap, MarkerF, MarkerClustererF } from '@react-google-maps/api';
import LocationAutocomplete from '@/components/location-autocomplete';
import type { Tribe, Meeting, Application, UserProfile, GetAlignmentTestOutput, TribeMember, MeetingReport, OutboundEmail, JournalEntry, JournalFeedback } from '@/lib/types';
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
import { evaluateAlignmentTest } from '@/ai/flows/evaluate-alignment-test';
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
import { applyForMentor } from '@/ai/flows/apply-for-mentor';
import { sendMeetingReportReminder } from '@/ai/flows/send-meeting-report-reminder';
import { getAllJournalEntries } from '@/ai/flows/get-all-journal-entries';
import { addJournalFeedback } from '@/ai/flows/add-journal-feedback';
import { editJournalFeedback } from '@/ai/flows/edit-journal-feedback';
import { deleteJournalFeedback } from '@/ai/flows/delete-journal-feedback';
import { addManualFaq } from '@/ai/flows/add-manual-faq';
import Image from 'next/image';
import { ImageUploader } from '@/components/image-uploader';


const libraries: Libraries = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
  marginBottom: '1rem',
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

function FormattingToolbar({
  textareaRef,
  onValueChange,
  value,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onValueChange: (newValue: string) => void;
  value: string;
}) {
  const formatText = (tag: 'b' | 'i' | 'u') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (selectedText) {
      const newText = `${value.substring(0, start)}<${tag}>${selectedText}</${tag}>${value.substring(end)}`;
      onValueChange(newText);
      
      // Re-focus and select the text after update
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length + 2, end + tag.length + 2);
      }, 0);
    }
  };

  return (
    <div className="flex gap-1 mb-2 p-1 border rounded-md bg-muted">
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => formatText('b')} title="Bold">
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => formatText('i')} title="Italic">
        <Italic className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => formatText('u')} title="Underline">
        <Underline className="h-4 w-4" />
      </Button>
    </div>
  );
}

function FeedbackForm({
  entryId,
  onActionComplete,
  user,
  editingFeedback,
  onCancelEdit,
}: {
  entryId: string;
  onActionComplete: () => void;
  user: User | null;
  editingFeedback?: JournalFeedback | null;
  onCancelEdit?: () => void;
}) {
  const [feedbackContent, setFeedbackContent] = useState(editingFeedback ? editingFeedback.feedbackContent : '');
  const [imageUrl, setImageUrl] = useState(editingFeedback?.imageUrl || '');
  const [imageCredit, setImageCredit] = useState(editingFeedback?.imageCredit || '');
  const [caption, setCaption] = useState(editingFeedback?.caption || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const { toast } = useToast();
  const isEditMode = !!editingFeedback;
  const feedbackTextareaRef = useRef<HTMLTextAreaElement>(null);
  const imageCreditTextareaRef = useRef<HTMLTextAreaElement>(null);
  const captionTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setFeedbackContent(editingFeedback ? editingFeedback.feedbackContent : '');
    setImageUrl(editingFeedback?.imageUrl || '');
    setImageCredit(editingFeedback?.imageCredit || '');
    setCaption(editingFeedback?.caption || '');
  }, [editingFeedback]);

  const handleSubmit = async () => {
    if (!feedbackContent.trim() || !user) {
      return;
    }
    setIsSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      if (isEditMode && editingFeedback) {
        const result = await editJournalFeedback({
          idToken,
          entryId,
          feedbackId: editingFeedback.id,
          newFeedbackContent: feedbackContent,
          imageUrl: imageUrl,
          imageCredit: imageCredit,
          caption: caption,
        });
        if (result.success) {
          toast({ title: 'Feedback Updated' });
        } else {
          throw new Error(result.message);
        }
      } else {
        const result = await addJournalFeedback({
          idToken,
          entryId,
          feedbackContent,
          imageUrl: imageUrl,
          imageCredit: imageCredit,
          caption: caption,
        });
        if (result.success) {
          toast({ title: 'Feedback Added' });
          setFeedbackContent('');
          setImageUrl('');
          setImageCredit('');
          setCaption('');
        } else {
          throw new Error(result.message);
        }
      }
      onActionComplete();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <p className="text-sm text-muted-foreground">You must be logged in to provide feedback.</p>;
  }

  return (
    <div className="mt-4 space-y-4 p-4 border rounded-lg bg-background">
      <h4 className="font-semibold">{isEditMode ? 'Edit Your Feedback' : 'Add Feedback'}</h4>
      <FormattingToolbar textareaRef={feedbackTextareaRef} value={feedbackContent} onValueChange={setFeedbackContent} />
      <Textarea
        ref={feedbackTextareaRef}
        placeholder="Write your feedback..."
        value={feedbackContent}
        onChange={(e) => setFeedbackContent(e.target.value)}
        rows={3}
      />
      <div className="space-y-4">
        <ImageUploader imageUrl={imageUrl} onImageUrlChange={setImageUrl} userId={user?.uid} label="Feedback Image" />
        {imageUrl && (
          <div className="space-y-1">
              <Label htmlFor="imageCredit" className="text-xs">Image Credit</Label>
              <FormattingToolbar textareaRef={imageCreditTextareaRef} value={imageCredit} onValueChange={setImageCredit} />
              <Textarea ref={imageCreditTextareaRef} id="imageCredit" value={imageCredit} onChange={e => setImageCredit(e.target.value)} placeholder="e.g., Photo by Jane Doe" rows={2}/>
          </div>
        )}
        <div className="space-y-1">
            <Label htmlFor="caption" className="text-xs">Caption</Label>
            <FormattingToolbar textareaRef={captionTextareaRef} value={caption} onValueChange={setCaption} />
            <Textarea ref={captionTextareaRef} id="caption" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption for content or image..." rows={2}/>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={isSubmitting || !feedbackContent.trim()}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEditMode ? null : <Send className="mr-2 h-4 w-4" />}
          {isEditMode ? 'Update Feedback' : 'Submit Feedback'}
        </Button>
        {isEditMode && (
          <Button variant="ghost" onClick={onCancelEdit}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function ExplorerView({ user, isLoaded, isLoading, tribes, userTribe, newTribeName, newTribeLocation, newTribeCoords, selectedTribe, handlePlaceSelected, handleCreateTribe, handleJoinTribe, setNewTribeName, setSelectedTribe, pendingApplication, handleWithdrawApplication, handleTabChange }) {
  const tribeAppliedTo = tribes.find(t => t.id === pendingApplication?.tribeId);

  return (
    <>
        {pendingApplication ? (
            <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <Info className="h-4 w-4 !text-blue-600" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Application Pending</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400 flex justify-between items-center">
                    <span>Your application to join "{tribeAppliedTo?.name || 'a tribe'}" is awaiting review by the chief.</span>
                    <Button onClick={() => handleWithdrawApplication(pendingApplication.id, pendingApplication.type as 'join_tribe' | 'new_tribe')} variant="destructive" size="sm" className="ml-4">Withdraw Application</Button>
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
                    <h4 className="font-semibold">Alignment Test Requirement</h4>
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
                <div className="absolute top-4 right-4 w-full max-sm z-10">
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
  const [alignmentTestData, setAlignmentTestData] = useState<GetAlignmentTestOutput>({ answers: {} });
  const [joinApplications, setJoinApplications] = useState<Application[]>([]);
  const [tribeCreationApps, setTribeCreationApps] = useState<Application[]>([]);
  const [mentorApplications, setMentorApplications] = useState<Application[]>([]);
  const [pendingApplication, setPendingApplication] = useState<Application | null>(null);
  const [pendingMentorApp, setPendingMentorApp] = useState<Application | null>(null);
  const [meetingReports, setMeetingReports] = useState<MeetingReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingAnswers, setIsFetchingAnswers] = useState(false);
  const [isSavingAnswers, setIsSavingAnswers] = useState(false);
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null);
  const [isClient, setIsClient] = useState(false);
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
  const [newEntrySubject, setNewEntrySubject] = useState('');
  const [newMentorEntryContent, setNewMentorEntryContent] = useState('');
  const [newMentorEntrySubject, setNewMentorEntrySubject] = useState('');
  const [newChiefEntryContent, setNewChiefEntryContent] = useState('');
  const [newChiefEntrySubject, setNewChiefEntrySubject] = useState('');
  const [isJournalLoading, setIsJournalLoading] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState<string | null>(null);
  const [allJournalEntries, setAllJournalEntries] = useState<JournalEntry[]>([]);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [manualFaqData, setManualFaqData] = useState({
    contributorName: '',
    question: '',
    answer: '',
    imageUrl: '',
    answerImageUrl: '',
    answerImageCredit: '',
    subject: '',
    questionCaption: '',
    answerCaption: '',
  });
  const [isAddingManualFaq, setIsAddingManualFaq] = useState(false);
  const manualFaqQuestionRef = useRef<HTMLTextAreaElement>(null);
  const manualFaqAnswerRef = useRef<HTMLTextAreaElement>(null);
  const manualFaqAnswerCreditRef = useRef<HTMLTextAreaElement>(null);
  const manualFaqAnswerCaptionRef = useRef<HTMLTextAreaElement>(null);
  const manualFaqQuestionCaptionRef = useRef<HTMLTextAreaElement>(null);


  type ForumEntry = JournalEntry;
  const getAuthorDisplay = (type: 'question' | 'answer', entry: ForumEntry, feedback?: JournalFeedback): string => {
      if (type === 'question') {
          const level = Number(entry.userLevel || 0);
          if (level === 0) return "Forum Contributor:";
          if (level === 1) return "Visitor Says:";
          if (level === 2) return "Guest Says:";
          if (level === 3) return "Explorer Says:";
          if (level === 4) return "Tribe Member Says:";
          if (level === 5) return "Chief Says:";
          if (level === 6) return "Mentor Says:";
          return "Contributor:";
      } else { // type === 'answer'
          const qLevel = Number(entry.userLevel || 0);
          if (qLevel === 0) return "Ed Says:";
          
          if (qLevel === 6) {
              return "Mentor's Mentor Says:";
          }

          if (!feedback) return '';
          if (feedback.mentorName?.toLowerCase().includes('ed')) return "Ed Says:";
          
          const level = Number(feedback.mentorLevel || 0);
          if (level === 5) return "Tribe Chief Says:";
          if (level >= 6) return "Mentor Says:";
          return "Mentor Says:";
      }
  };

  const { upcomingMeetings, pastMeetings } = useMemo(() => {
    if (!userTribe?.meetings) return { upcomingMeetings: [], pastMeetings: [] };
    const now = new Date();
    const upcoming = userTribe.meetings
      .filter(m => new Date(m.date as string) >= now)
      .sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());
    const past = userTribe.meetings
      .filter(m => new Date(m.date as string) < now)
      .sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());
    return { upcomingMeetings: upcoming, pastMeetings: past };
  }, [userTribe?.meetings]);

  const outstandingReportsCount = useMemo(() => {
    if (!user || !pastMeetings) return 0;
    return pastMeetings.filter(m => !meetingReports.find(r => r.meetingId === m.id && r.userId === user.uid)).length;
  }, [user, pastMeetings, meetingReports]);
  
  const chiefBadgeCount = useMemo(() => {
    const pendingForChief = allJournalEntries.filter(entry => 
        (!entry.feedback || entry.feedback.length === 0) && 
        entry.recipient === 'Chief' &&
        userTribe?.members?.includes(entry.userId)
    ).length;
    return joinApplications.length + pendingForChief;
  }, [joinApplications, allJournalEntries, userTribe]);

  const mentorBadgeCount = useMemo(() => {
    const pendingForumEntries = allJournalEntries.filter(entry => !entry.feedback || entry.feedback.length === 0).length;
    return tribeCreationApps.length + mentorApplications.length + pendingForumEntries;
  }, [tribeCreationApps, mentorApplications, allJournalEntries]);

  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const activeTabFromUrl = searchParams.get('view');
  const activeTab = activeTabFromUrl || (Number(userLevel) < 4 ? 'find-or-start-tribe' : 'my-profile');

  const { toast } = useToast();
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const isChief = userTribe && userTribe.chief === user?.uid;
  const isMentor = Number(userLevel) >= 6;

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
        toast({ title: "Error fetching forum questions", description: e.message, variant: "destructive" });
    } finally {
        setIsJournalLoading(false);
    }
  }, [user, toast]);
  
  
  useEffect(() => {
      if (activeTab === 'email' && user) {
          fetchOutbox();
      }
      if (activeTab === 'faq' && user) {
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

      setUserLevel(Number(progress.currentUserLevel || 1));
      setUserProfile(profile);
      
      if (myPendingAppsResult.success && myPendingAppsResult.applications) {
        setPendingApplication(myPendingAppsResult.applications.find(app => app.type === 'join_tribe' || app.type === 'new_tribe') || null);
        setPendingMentorApp(myPendingAppsResult.applications.find(app => app.type === 'new_mentor') || null);
      } else {
        setPendingApplication(null);
        setPendingMentorApp(null);
      }


      const tribesWithMembers = allTribes.map(t => ({
        ...t,
        members: t.members || [],
        meetings: t.meetings || []
      }));

      setTribes(tribesWithMembers as Tribe[]);
      const currentUserTribe = (tribesWithMembers as Tribe[]).find(tribe => tribe.members.includes(currentUser.uid));
      setUserTribe(currentUserTribe || null);
      
      // Fetch role-specific data
      if (Number(progress.currentUserLevel) >= 5) { // Chief or Mentor
        const allJournalEntriesResult = await getAllJournalEntries();
        setAllJournalEntries(allJournalEntriesResult);

        if (Number(progress.currentUserLevel) >= 6) { // Mentor
            const [newTribeAppsResult, newMentorAppsResult] = await Promise.all([
              manageApplication({ action: 'get', type: 'new_tribe', idToken }),
              manageApplication({ action: 'get', type: 'new_mentor', idToken }),
            ]);
            if (newTribeAppsResult.success && newTribeAppsResult.applications) {
                setTribeCreationApps(newTribeAppsResult.applications);
            }
            if (newMentorAppsResult.success && newMentorAppsResult.applications) {
                setMentorApplications(newMentorAppsResult.applications);
            }
        }
      }
      
      if (currentUserTribe) { // Member or Chief of a tribe
          const [members, reports] = await Promise.all([
             getTribeMembers({ tribeId: currentUserTribe.id, idToken }),
             getMeetingReports({ tribeId: currentUserTribe.id, idToken }),
          ]);
          setTribeMembers(members);
          setMeetingReports(reports);
          
          if (currentUserTribe.chief === currentUser.uid) { // Chief specific
              const joinAppsResult = await manageApplication({ action: 'get', type: 'join_tribe', idToken });
              if (joinAppsResult.success && joinAppsResult.applications) {
                  const sortedApps = joinAppsResult.applications.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
                  setJoinApplications(sortedApps);
              }
          }
      } else {
          setTribeMembers([]);
          setMeetingReports([]);
      }

    } catch (error: any) {
        console.error("Error fetching page data: ", error);
        toast({ title: 'Error', description: error.message || 'Could not load your tribe and alignment test data.', variant: 'destructive' });
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
            const data = await getAlignmentTest({ idToken });
            setAlignmentTestData(data);
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

  useEffect(() => {
    if (isFetchingAnswers || !user) {
      return;
    }
  
    const handler = setTimeout(async () => {
      if (Object.keys(alignmentTestData.answers).length > 0) {
        setIsSavingAnswers(true);
        try {
          const idToken = await user.getIdToken();
          await saveAlignmentTest({ answers: alignmentTestData.answers, idToken });
        } catch (error) {
          console.error("Auto-save failed:", error);
          toast({ title: 'Auto-save failed', variant: 'destructive'});
        } finally {
          setIsSavingAnswers(false);
        }
      }
    }, 1500);
  
    return () => {
      clearTimeout(handler);
    };
  }, [alignmentTestData.answers, user, isFetchingAnswers, toast]);

  const handleCreateTribe = async () => {
    if (!newTribeName.trim() || !newTribeLocation.trim() || !newTribeCoords) {
        toast({ title: 'Error', description: 'Please provide a valid name and select a location from the dropdown.', variant: 'destructive' });
        return;
    }
    if (!user) {
        toast({ title: 'Authentication Error', description: 'You must be logged in to create a tribe.', variant: 'destructive' });
        return;
    }
    
    // Check for alignment test completion
    if (Object.keys(alignmentTestData.answers).length === 0) {
        toast({
            title: 'Alignment Test Required',
            description: 'You must complete the alignment test before creating a tribe. You are now on the test page.',
            duration: 5000,
        });
        handleTabChange('my-profile');
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

    if (Object.keys(alignmentTestData.answers).length === 0) {
        toast({
            title: 'Alignment Test Required',
            description: 'You must complete the alignment test before joining a tribe. You are now on the test page.',
            duration: 5000,
        });
        handleTabChange('my-profile');
        setSelectedTribe(null);
        return;
    }

    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const userAnswersData = await getAlignmentTest({ idToken });
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

  const handleWithdrawApplication = async (applicationId: string, appType: 'join_tribe' | 'new_tribe' | 'new_mentor') => {
    if (!user) return;
    setIsLoading(true);
    try {
        const idToken = await user.getIdToken();
        const result = await manageApplication({
            action: 'withdraw',
            applicationId,
            type: appType,
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
    setAlignmentTestData(prev => ({...prev, answers: { ...prev.answers, [question]: value }}));
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
        meetings: updatedMeetings.map(m => ({ ...m, date: m.date instanceof Date ? m.date.toISOString() : (m.date as string) })),
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
        meetings: updatedMeetings.map(m => ({ ...m, date: (m.date as Date).toISOString() })),
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
        const evaluation = await evaluateAlignmentTest({ answers: alignmentTestData.answers, idToken });
        
        setAlignmentTestData(prev => ({
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
  
  const openComposerForApplicant = (app: Application) => {
    if (app.applicantEmail) {
      setEmailRecipients([{ email: app.applicantEmail, name: app.applicantName || app.applicantEmail }]);
      setIsEmailModalOpen(true);
    } else {
      toast({ title: "Applicant's email not found", variant: "destructive" });
    }
  };
  
  const handleSaveJournalEntry = async (recipient: 'Ed' | 'Mentor' | 'Chief') => {
    let content = '';
    let subject = '';
    let setContent: (val: string) => void = () => {};
    let setSubject: (val: string) => void = () => {};

    if (recipient === 'Ed') {
        content = newEntryContent;
        subject = newEntrySubject;
        setContent = setNewEntryContent;
        setSubject = setNewEntrySubject;
    } else if (recipient === 'Mentor') {
        content = newMentorEntryContent;
        subject = newMentorEntrySubject;
        setContent = setNewMentorEntryContent;
        setSubject = setNewMentorEntrySubject;
    } else if (recipient === 'Chief') {
        content = newChiefEntryContent;
        subject = newChiefEntrySubject;
        setContent = setNewChiefEntryContent;
        setSubject = setNewChiefEntrySubject;
    }

    if (!content.trim()) {
      toast({ title: 'Question is empty', variant: 'destructive' });
      return;
    }
    if (!user) return;
    
    setIsJournalLoading(true);
    try {
      const idToken = await user.getIdToken();
      await saveJournalEntry({ 
        entryContent: content, 
        subject: subject,
        idToken,
        recipient: recipient
      });
      setContent('');
      setSubject('');
      toast({ title: 'Question Submitted' });
      fetchJournal(); // Refresh journal entries
    } catch(e: any) {
      toast({ title: "Error Submitting Question", description: e.message, variant: 'destructive' });
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
        toast({ title: 'Question Deleted' });
        fetchJournal();
    } catch (e: any) {
        toast({ title: 'Error Deleting Question', description: e.message, variant: 'destructive' });
    } finally {
        setIsJournalLoading(false);
    }
  };
  
  const handleApplyForMentor = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const idToken = await user.getIdToken();
        const result = await applyForMentor({ idToken });
        if (result.success) {
            toast({ title: 'Application Submitted', description: result.message });
            fetchTribesAndUserData(user); // Refresh data
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };
  
  const getNagMessage = useCallback((meetingDate: Date): { message: string, level: 'gentle' | 'medium' | 'nagging' } | null => {
    if (!isClient || !currentTime) return null;
    const daysPast = (currentTime.getTime() - new Date(meetingDate).getTime()) / (1000 * 3600 * 24);

    if (daysPast <= 0) return null;

    if (daysPast > 7) {
      return {
        message: "Your report for this meeting is overdue. Submitting reports is a key part of tribe accountability.",
        level: 'nagging'
      };
    }
    if (daysPast > 3) {
      return {
        message: "Your report for this meeting is pending.",
        level: 'medium'
      };
    }
    return {
      message: "You might consider submitting your report for this meeting.",
      level: 'gentle'
    };
  }, [isClient, currentTime]);
  
  const handleSendReminder = async (member: TribeMember, meeting: Meeting, nagLevel: 'gentle' | 'medium' | 'nagging') => {
    if (!userTribe) return;
    const reminderId = `${member.uid}-${meeting.id}`;
    setIsSendingReminder(reminderId);
    try {
        const result = await sendMeetingReportReminder({
            recipientEmail: member.email,
            recipientName: `${member.firstName} ${member.lastName}`,
            tribeName: userTribe.name,
            meetingDate: (meeting.date as Date).toISOString(),
            nagLevel: nagLevel,
        });

        if (result.success) {
            toast({ title: "Reminder Sent", description: `A ${nagLevel} reminder has been sent to ${member.firstName}.` });
        } else {
            throw new Error(result.message);
        }

    } catch (error: any) {
        toast({ title: "Error Sending Reminder", description: error.message, variant: "destructive" });
    } finally {
        setIsSendingReminder(null);
    }
  };

  const handleDeleteFeedback = async (entryId: string, feedbackId: string) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const result = await deleteJournalFeedback({ idToken, entryId, feedbackId });
      if (result.success) {
        toast({ title: 'Feedback Deleted' });
        if (user) fetchTribesAndUserData(user); // Refresh data
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleManualFaqChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setManualFaqData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleManualFaqImageUrlChange = (url: string, type: 'question' | 'answer') => {
    if (type === 'question') {
      setManualFaqData(prev => ({ ...prev, imageUrl: url }));
    } else {
      setManualFaqData(prev => ({ ...prev, answerImageUrl: url }));
    }
  };

  const handleAddManualFaq = async () => {
      if (!user) {
          toast({ title: "Authentication Error", variant: "destructive" });
          return;
      }
      if (!manualFaqData.contributorName || !manualFaqData.question || !manualFaqData.answer) {
          toast({ title: "All fields except Image URL are required.", variant: "destructive" });
          return;
      }

      setIsAddingManualFaq(true);
      try {
          const idToken = await user.getIdToken();
          const result = await addManualFaq({
              idToken,
              contributorName: manualFaqData.contributorName,
              question: manualFaqData.question,
              answer: manualFaqData.answer,
              imageUrl: manualFaqData.imageUrl || undefined,
              answerImageUrl: manualFaqData.answerImageUrl || undefined,
              answerImageCredit: manualFaqData.answerImageCredit || undefined,
              subject: manualFaqData.subject || undefined,
              questionCaption: manualFaqData.questionCaption || undefined,
              answerCaption: manualFaqData.answerCaption || undefined,
          });

          if (result.success) {
              toast({ title: "Success", description: result.message });
              setManualFaqData({ contributorName: '', question: '', answer: '', imageUrl: '', answerImageUrl: '', answerImageCredit: '', subject: '', questionCaption: '', answerCaption: '' });
              fetchTribesAndUserData(user);
          } else {
              throw new Error(result.message);
          }

      } catch (error: any) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
          setIsAddingManualFaq(false);
      }
  };

  if (isLoading || !isLoaded || !user) {
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

  const meetingDates = userTribe?.meetings?.map(m => new Date(m.date as string)) || [];
  
  const renderLockedTabTrigger = (value: string, title: string, requiredLevel: number, badgeCount?: number) => {
    const isUnlocked = Number(userLevel) >= requiredLevel;
    const tooltipContent = `Requires Level ${requiredLevel} (${{4: 'Member', 5: 'Chief', 6: 'Mentor'}[requiredLevel]}).`;
    
    const Trigger = (
        <TabsTrigger value={value} disabled={!isUnlocked} className={cn("text-base relative flex items-center gap-2", !isUnlocked && 'text-muted-foreground/50 cursor-not-allowed')}>
            {title}
            {isUnlocked && badgeCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                {badgeCount}
              </span>
            )}
            {!isUnlocked && <Lock className="h-3 w-3" />}
        </TabsTrigger>
    );

    if (isUnlocked) {
        return Trigger;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
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
        <div className="flex justify-end">
            <Button asChild variant="outline">
                <Link href="/faq">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Go to The Forum
                </Link>
            </Button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card id="ask-ed">
                <CardHeader>
                    <CardTitle>Ask Ed</CardTitle>
                    <CardDescription>
                      Ask a question directly to Ed. Your question and the response will appear in the Forum once answered.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-entry-subject">Subject</Label>
                        <Input 
                            id="new-entry-subject"
                            placeholder="e.g., Dealing with Fear"
                            value={newEntrySubject}
                            onChange={(e) => setNewEntrySubject(e.target.value)}
                            disabled={isJournalLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-entry-content">Your Question</Label>
                        <Textarea 
                            id="new-entry-content"
                            placeholder="Ask Ed here..."
                            rows={8}
                            value={newEntryContent}
                            onChange={(e) => setNewEntryContent(e.target.value)}
                            disabled={isJournalLoading}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleSaveJournalEntry('Ed')} disabled={isJournalLoading || !newEntryContent.trim()} className="w-full">
                        {isJournalLoading && newEntryContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Submit Question to Ed
                    </Button>
                </CardFooter>
            </Card>

            <Card id="ask-mentor">
                <CardHeader>
                    <CardTitle>Ask a Mentor</CardTitle>
                    <CardDescription>
                      Ask a question to the community of Mentors. Your question and the response will appear in the Forum.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="mentor-subject">Subject</Label>
                        <Input 
                            id="mentor-subject"
                            placeholder="e.g., Tribe Logistics"
                            value={newMentorEntrySubject}
                            onChange={(e) => setNewMentorEntrySubject(e.target.value)}
                            disabled={isJournalLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mentor-content">Your Question</Label>
                        <Textarea 
                            id="mentor-content"
                            placeholder="Ask a Mentor here..."
                            rows={8}
                            value={newMentorEntryContent}
                            onChange={(e) => setNewMentorEntryContent(e.target.value)}
                            disabled={isJournalLoading}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleSaveJournalEntry('Mentor')} disabled={isJournalLoading || !newMentorEntryContent.trim()} variant="secondary" className="w-full">
                        {isJournalLoading && newMentorEntryContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Submit Question to Mentor
                    </Button>
                </CardFooter>
            </Card>

            <Card id="ask-chief">
                <CardHeader>
                    <CardTitle>Ask Your Chief</CardTitle>
                    <CardDescription>
                      Direct a question to your Tribe Chief. If you are not in a tribe, your question will be held until you join one.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="chief-subject">Subject</Label>
                        <Input 
                            id="chief-subject"
                            placeholder="e.g., Next Meeting"
                            value={newChiefEntrySubject}
                            onChange={(e) => setNewChiefEntrySubject(e.target.value)}
                            disabled={isJournalLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="chief-content">Your Question</Label>
                        <Textarea 
                            id="chief-content"
                            placeholder="Ask your Chief here..."
                            rows={8}
                            value={newChiefEntryContent}
                            onChange={(e) => setNewChiefEntryContent(e.target.value)}
                            disabled={isJournalLoading}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => handleSaveJournalEntry('Chief')} disabled={isJournalLoading || !newChiefEntryContent.trim()} variant="outline" className="w-full">
                        {isJournalLoading && newChiefEntryContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Submit Question to Chief
                    </Button>
                </CardFooter>
            </Card>
        </div>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Your Past Questions</CardTitle>
                  <CardDescription>Review your past questions and the feedback you've received.</CardDescription>
                </div>
                <Button asChild>
                    <Link href="/faq">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Go to The Forum
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {isJournalLoading && journalEntries.length === 0 ? (
                    <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
                ) : journalEntries.length === 0 ? (
                    <p className="text-center text-muted-foreground p-8">You have no questions yet.</p>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {journalEntries.map(entry => (
                            <AccordionItem key={entry.id} value={entry.id}>
                                <div className="flex items-center w-full p-4">
                                    <AccordionTrigger className="flex-grow p-0 text-left">
                                        <div className="grid w-full gap-1 text-left">
                                            <div className="flex w-full justify-between">
                                                <span className="font-semibold">
                                                    Question {entry.recipient && <span className="text-primary">to {entry.recipient}</span>} {entry.subject && <span className="font-normal text-muted-foreground"> - {entry.subject}</span>}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{isClient ? format(new Date(entry.createdAt), 'PPP p') : '...'}</span>
                                            </div>
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
                                                <AlertDialogTitle>Delete this question?</AlertDialogTitle>
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
                                    <div className="prose dark:prose-invert max-w-none px-4 pb-4" dangerouslySetInnerHTML={{ __html: entry.entryContent.replace(/\n/g, '<br />') }} />
                                    {entry.feedback && entry.feedback.length > 0 && (
                                      <div className="mt-6 space-y-4 px-4 pb-4">
                                          <h4 className="font-semibold text-md">Feedback</h4>
                                          {entry.feedback.map((fb, index) => {
                                            const answerAuthorLabel = getAuthorDisplay('answer', entry, fb);
                                            return (
                                              <Alert key={index} className="bg-muted/50">
                                                  <UserIcon className="h-4 w-4" />
                                                  <AlertDescription>
                                                      <div className="flex justify-between items-center text-sm mb-2">
                                                          <span className="font-semibold text-foreground">{answerAuthorLabel}</span>
                                                      </div>
                                                      <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: fb.feedbackContent.replace(/\n/g, '<br />') }} />
                                                  </AlertDescription>
                                              </Alert>
                                            )
                                          })}
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

  const renderPendingForumList = (entries: JournalEntry[]) => (
    <Accordion type="single" collapsible className="w-full">
        {entries.map(entry => (
            <AccordionItem key={entry.id} value={entry.id} className="border-b mb-2">
                <AccordionTrigger className="text-left py-4 px-2 hover:no-underline hover:bg-muted/50 rounded-md transition-all">
                    <div className="grid w-full gap-1 text-left">
                        <div className="flex w-full justify-between items-center">
                            <span className="font-semibold flex items-center">
                                {entry.userName}
                                {entry.recipient === 'Ed' && <span className="flex items-center text-xs text-primary font-bold ml-2 px-2 py-0.5 rounded-full bg-primary/10 ring-1 ring-primary/20">TO ED</span>}
                            </span>
                            <span className="text-xs text-muted-foreground">{isClient ? new Date(entry.createdAt).toLocaleDateString() : '...'}</span>
                        </div>
                        {entry.subject && <p className="font-medium text-sm text-foreground/80 line-clamp-1">Subject: {entry.subject}</p>}
                        <p className="truncate text-xs text-muted-foreground break-words pr-4">
                            {entry.entryContent.replace(/<[^>]*>/g, '')}
                        </p>
                    </div>
                </AccordionTrigger>
            <AccordionContent className="pt-4 border-t mt-2">
                <div className="prose dark:prose-invert max-w-none px-4 pb-4" dangerouslySetInnerHTML={{ __html: entry.entryContent.replace(/\n/g, '<br />') }} />
                {entry.imageUrl && (
                    <div className="my-4 px-4 relative aspect-video">
                        <Image src={entry.imageUrl} alt="Forum entry image" fill className="rounded-md object-contain" />
                    </div>
                )}
                {entry.caption && <div className="text-center text-sm text-muted-foreground italic mt-2" dangerouslySetInnerHTML={{ __html: entry.caption.replace(/\n/g, '<br />')}}/>}
                <div className="mt-6 space-y-4 px-4 pb-4">
                <h4 className="font-semibold text-md">Feedback</h4>
                {entry.feedback && entry.feedback.length > 0 ? (
                    <div className="space-y-4">
                    {entry.feedback.map((fb) => {
                        const answerAuthorLabel = getAuthorDisplay('answer', entry, fb);
                        
                        return editingFeedbackId === fb.id ? (
                            <FeedbackForm
                            key={fb.id}
                            entryId={entry.id}
                            user={user}
                            editingFeedback={fb}
                            onActionComplete={() => {
                                setEditingFeedbackId(null);
                                if (user) fetchTribesAndUserData(user);
                            }}
                            onCancelEdit={() => setEditingFeedbackId(null)}
                            />
                        ) : (
                            <Alert key={fb.id} className="bg-muted/50 relative group">
                                <UserIcon className="h-4 w-4" />
                                <AlertDescription>
                                  <div className="flex justify-between items-center text-sm mb-2">
                                      <span className="font-semibold text-foreground">{answerAuthorLabel}</span>
                                  </div>
                                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: fb.feedbackContent.replace(/\n/g, '<br />') }} />
                                    {fb.imageUrl && (
                                        <div className="mt-4">
                                            <div className="relative aspect-video">
                                                <Image src={fb.imageUrl} alt="Feedback Image" fill sizes="(max-width: 1023px) 90vw, 45vw" className="rounded-md object-contain" />
                                            </div>
                                            {fb.imageCredit && <div className="text-center text-xs text-muted-foreground italic mt-2" dangerouslySetInnerHTML={{ __html: fb.imageCredit}} />}
                                            {fb.caption && <div className="text-center text-sm text-muted-foreground italic mt-4" dangerouslySetInnerHTML={{ __html: fb.caption.replace(/\n/g, '<br />')}}/>}
                                        </div>
                                    )}
                                </AlertDescription>
                                {(isMentor || isChief) && (
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingFeedbackId(fb.id)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete this feedback. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteFeedback(entry.id, fb.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                                )}
                            </Alert>
                        )
                    }
                    )}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No feedback yet.</p>
                )}
                {editingFeedbackId === null && (isMentor || isChief) && (
                    <FeedbackForm
                        entryId={entry.id}
                        user={user}
                        onActionComplete={() => { if(user) fetchTribesAndUserData(user) }}
                    />
                )}
                </div>
            </AccordionContent>
            </AccordionItem>
        ))}
    </Accordion>
  );

  const renderMemberChiefView = () => (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6 h-auto p-1">
            {renderLockedTabTrigger("my-profile", "My Profile & Test", 3)}
            {renderLockedTabTrigger("meeting-reports", "Meeting Reports", 4, outstandingReportsCount)}
            {renderLockedTabTrigger("faq", "The Forum", 2)}
            {renderLockedTabTrigger("chief-dashboard", "Chief Dashboard", 5, chiefBadgeCount > 0 ? chiefBadgeCount : undefined)}
            {renderLockedTabTrigger("mentor-dashboard", "Mentor Dashboard", 6, mentorBadgeCount > 0 ? mentorBadgeCount : undefined)}
        </TabsList>

        <TabsContent value="my-profile" className="m-0 space-y-8">
            {userTribe && (
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
                </>
            )}

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
            
            {Number(userLevel) >= 5 && (
              <Card>
                <CardHeader>
                  <CardTitle>Apply for Mentorship</CardTitle>
                  <CardDescription>
                    As a Tribe Chief, you can apply to become a Mentor to help guide new Chiefs. Mentors review new tribe applications.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingMentorApp ? (
                    <Alert>
                      <AlertTitle>Application Pending</AlertTitle>
                      <AlertDescription className="flex justify-between items-center">
                        <span>Your application to become a mentor is currently under review.</span>
                        <Button onClick={() => handleWithdrawApplication(pendingMentorApp.id, 'new_mentor')} variant="destructive" size="sm">Withdraw</Button>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Button onClick={handleApplyForMentor} disabled={isLoading}>
                      {isLoading ? 'Submitting...' : 'Submit Mentor Application'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle>Alignment Test</CardTitle>
                    <CardDescription>Review or update your answers. Your answers save automatically.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                {isFetchingAnswers ? (<p>Loading your answers...</p>) : (
                comprehensionQuestions.map((q, i) => (
                <div key={i} className="grid w-full gap-1.5">
                    <Label htmlFor={`question-${i}`}>{i + 1}. {q}</Label>
                    <Textarea id={`question-${i}`} rows={5} value={alignmentTestData.answers[q] || ''} onChange={(e) => handleAnswerChange(q, e.target.value)} placeholder="Your answer..." disabled={isLoading || isEvaluating} />
                </div>
                ))
                )}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 justify-between items-center">
                  <div>
                    {isSavingAnswers && <span className="text-sm text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</span>}
                  </div>
                  <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button onClick={handleReceiveFeedback} disabled={isLoading || isEvaluating}>
                                  {isEvaluating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating...</> : 'Receive Feedback from The Chief'}
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p>You can check your answers at any time.</p>
                          </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
                </CardFooter>
                {alignmentTestData.latestFeedback && (
                <CardContent>
                <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle className="flex justify-between">
                    <span>You Receive Guidance</span>
                    <span className="text-sm font-normal text-muted-foreground">{isClient ? new Date(alignmentTestData.latestFeedback.createdAt).toLocaleString() : '...'}</span>
                    </AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap">{alignmentTestData.latestFeedback.feedback}</AlertDescription>
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
        
        <TabsContent value="meeting-reports" className="m-0 space-y-8">
            {userTribe ? (
            <>
                <Card>
                <CardHeader><CardTitle>Upcoming Meetings</CardTitle></CardHeader>
                <CardContent>
                    {upcomingMeetings.length > 0 ? (
                    <ul className="space-y-3">
                        {upcomingMeetings.map(meeting => (
                        <li key={meeting.id} className="flex flex-col p-2 border rounded-md">
                            <span className="font-semibold">{isClient ? format(new Date(meeting.date), 'PPP p') : '...'}</span>
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
                          const nag = !userReport ? getNagMessage(new Date(meeting.date)) : null;

                          return (
                            <AccordionItem key={meeting.id} value={meeting.id}>
                                <div className="flex items-center w-full p-4">
                                    <AccordionTrigger className="flex-grow p-0 text-left">
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{isClient ? format(new Date(meeting.date), 'PPP') : '...'}</span>
                                            {nag && (
                                            <span className={cn("text-xs mt-1", {
                                                'text-yellow-600 dark:text-yellow-400': nag.level === 'medium',
                                                'text-red-600 dark:text-red-400 font-bold': nag.level === 'nagging',
                                                'text-muted-foreground': nag.level === 'gentle',
                                            })}>
                                                {nag.message}
                                            </span>
                                            )}
                                        </div>
                                    </AccordionTrigger>
                                    <Button variant="secondary" size="sm" className="ml-4 shrink-0" onClick={() => handleMeetingReportAction(meeting, userReport)}>
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
                  <CardDescription>Once you join a tribe, your meeting reports will appear here. Go to the "My Profile" tab to find and apply for a tribe or start your own.</CardDescription>
              </CardHeader>
            </Card>
            )}
        </TabsContent>

        <TabsContent value="faq" className="m-0">
          {renderJournalView()}
        </TabsContent>
        
        {isChief && userTribe && (
            <TabsContent value="chief-dashboard" className="m-0 space-y-8">
                 <Card>
                    <CardHeader>
                    <CardTitle>Manage Meetings</CardTitle><CardDescription>Schedule and view meetings for your tribe.</CardDescription>
                    <p className="text-sm font-semibold pt-2">Current Time: {isClient && currentTime ? currentTime.toLocaleTimeString() : '...'}</p>
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
                        <ul className="space-y-2 max-h-80 overflow-y-auto">{upcomingMeetings.map(meeting => (<li key={meeting.id} className="flex items-center justify-between p-2 border rounded-md"><div className="flex-1"><p className="font-medium">{isClient ? format(new Date(meeting.date), 'PPP p') : '...'}</p></div><Button variant="ghost" size="icon" onClick={() => handleDeleteMeeting(meeting.id)}><Trash2 className="h-4 w-4" /></Button></li>))}</ul>
                        ) : (<p className="text-sm text-center text-muted-foreground bg-gray-50 p-4 rounded-md">No upcoming meetings.</p>)}
                    </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/50 shadow-md">
                    <CardHeader className="bg-primary/5">
                        <CardTitle className="flex items-center gap-2 text-primary"><BookHeart /> Pending Forum Entries</CardTitle>
                        <CardDescription>Questions from your tribe members that need a response.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isLoading ? (
                            <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : (() => {
                            const pendingForChief = allJournalEntries.filter(entry => 
                                (!entry.feedback || entry.feedback.length === 0) && 
                                entry.recipient === 'Chief' &&
                                userTribe?.members?.includes(entry.userId)
                            );
                            return pendingForChief.length > 0 ? renderPendingForumList(pendingForChief) : (
                                <p className="text-muted-foreground text-center p-8">No pending questions for you.</p>
                            );
                        })()}
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
                        <AccordionTrigger className="text-left">{member.uid === userTribe.chief ? 'Chief: ' : ''}{member.firstName} {member.lastName}</AccordionTrigger>
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
                             <div>
                                <h4 className="font-semibold mb-2">Meeting Report Status</h4>
                                <div className="space-y-3 text-sm p-3 border rounded-md max-h-60 overflow-y-auto bg-muted/50">
                                    {pastMeetings.length > 0 ? pastMeetings.map(meeting => {
                                        const memberReport = meetingReports.find(r => r.meetingId === meeting.id && r.userId === member.uid);
                                        const nag = !memberReport ? getNagMessage(new Date(meeting.date)) : null;

                                        return (
                                            <div key={meeting.id} className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">Meeting: {isClient ? format(new Date(meeting.date), 'PPP') : '...'}</p>
                                                    {memberReport ? (
                                                        <p className="text-green-600 dark:text-green-400 text-xs">Report Submitted</p>
                                                    ) : nag ? (
                                                        <p className={cn("text-xs", {
                                                            'text-yellow-600 dark:text-yellow-400': nag.level === 'medium',
                                                            'text-red-600 dark:text-red-400 font-bold': nag.level === 'nagging',
                                                            'text-muted-foreground': nag.level === 'gentle',
                                                        })}>{nag.message}</p>
                                                    ) : (
                                                         <p className="text-xs text-muted-foreground">Report not yet due.</p>
                                                    )}
                                                </div>
                                                {!memberReport && nag && (
                                                    <Button size="sm" variant="secondary" onClick={() => handleSendReminder(member, meeting, nag.level)} disabled={isSendingReminder === `${member.uid}-${meeting.id}`}>
                                                        {isSendingReminder === `${member.uid}-${meeting.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                                        Send Reminder
                                                    </Button>
                                                )}
                                            </div>
                                        )
                                    }) : <p className="text-xs text-muted-foreground">No past meetings to report on.</p>}
                                </div>
                            </div>
                            {member.answers && (
                                <div>
                                <h4 className="font-semibold mb-2">Alignment Test Answers</h4>
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
                            <AccordionTrigger className="text-left"><div className="flex flex-col items-start"><span>Applicant: {app.applicantName}</span><span className="text-xs text-muted-foreground">{isClient ? new Date(app.createdAt).toLocaleString() : '...'}</span></div></AccordionTrigger>
                            <AccordionContent>
                            <div className="space-y-4">
                                <div><h4 className="font-semibold mb-2">Applicant Information</h4><div className="text-sm space-y-1"><p><span className="font-medium">Email:</span> {app.applicantEmail || 'N/A'}</p><p><span className="font-medium">Phone:</span> {app.applicantPhone || 'N/A'}</p></div></div>
                                <div>
                                <p className="text-sm"><span className="font-semibold">Issue:</span> {app.issue || 'Not specified'}</p>
                                <p className="text-sm"><span className="font-semibold">Service Project:</span> {app.serviceProject || 'Not specified'}</p>
                                </div>
                                <div>
                                <h4 className="font-semibold mb-2">Alignment Test Answers</h4>
                                <div className="space-y-2 text-sm p-3 border rounded-md max-h-60 overflow-y-auto">{Object.entries(app.answers || {}).map(([question, answer]) => (<div key={question}><p className="font-medium">{question}</p><p className="text-muted-foreground whitespace-pre-wrap">{answer || "No answer provided."}</p></div>))}
                                    {(!app.answers || Object.keys(app.answers).length === 0) && <p>No answers provided.</p>}
                                </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => openComposerForApplicant(app)} disabled={isLoading}><Mail className="mr-2 h-4 w-4"/>Email</Button><Button variant="destructive" onClick={() => handleApplicationAction('deny', app)} disabled={isLoading}>Deny</Button><Button onClick={() => handleApplicationAction('approve', app)} disabled={isLoading}>Approve</Button></div>
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
            <TabsContent value="mentor-dashboard" className="m-0 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>New Tribe Applications</CardTitle>
                        <CardDescription>Review applications from members who want to start their own tribe.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {tribeCreationApps.length > 0 ? (
                              <Accordion type="single" collapsible className="w-full">
                              {tribeCreationApps.map(app => (
                              <AccordionItem key={app.id} value={app.id}>
                                  <AccordionTrigger className="text-left"><div className="flex flex-col items-start"><span>{app.applicantName} - {app.tribeName}</span><span className="text-xs text-muted-foreground">{isClient ? new Date(app.createdAt).toLocaleString() : '...'}</span></div></AccordionTrigger>
                                  <AccordionContent>
                                  <div className="space-y-4">
                                      <div><h4 className="font-semibold mb-2">Applicant & Tribe Info</h4><div className="text-sm space-y-1"><p><span className="font-medium">Email:</span> {app.applicantEmail || 'N/A'}</p><p><span className="font-medium">Phone:</span> {app.applicantPhone || 'N/A'}</p><p><span className="font-medium">Proposed Location:</span> {app.location || 'N/A'}</p></div></div>
                                      <div>
                                      <p className="text-sm"><span className="font-semibold">Issue:</span> {app.issue || 'Not specified'}</p>
                                      <p className="text-sm"><span className="font-semibold">Service Project:</span> {app.serviceProject || 'Not specified'}</p>
                                      </div>
                                      <div>
                                      <h4 className="font-semibold mb-2">Alignment Test Answers</h4>
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
                <Card>
                    <CardHeader>
                        <CardTitle>New Mentor Applications</CardTitle>
                        <CardDescription>Review applications from Chiefs who want to become Mentors.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {mentorApplications.length > 0 ? (
                            <Accordion type="single" collapsible className="w-full">
                            {mentorApplications.map(app => (
                                <AccordionItem key={app.id} value={app.id}>
                                <AccordionTrigger className="text-left"><div className="flex flex-col items-start"><span>Applicant: {app.applicantName}</span><span className="text-xs text-muted-foreground">{isClient ? new Date(app.createdAt).toLocaleString() : '...'}</span></div></AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-4">
                                        <div><h4 className="font-semibold mb-2">Applicant Information</h4><div className="text-sm space-y-1"><p><span className="font-medium">Email:</span> {app.applicantEmail || 'N/A'}</p><p><span className="font-medium">Phone:</span> {app.applicantPhone || 'N/A'}</p></div></div>
                                        <div>
                                            <p className="text-sm"><span className="font-semibold">Issue:</span> {app.issue || 'Not specified'}</p>
                                            <p className="text-sm"><span className="font-semibold">Service Project:</span> {app.serviceProject || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-2">Alignment Test Answers</h4>
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
                            <p className="text-muted-foreground">There are currently no pending applications for mentorship.</p>
                        )}
                    </CardContent>
                </Card>

                {/* PENDING FOR ED SECTION */}
                <Card className="border-primary/50 shadow-md">
                    <CardHeader className="bg-primary/5">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-primary"><BookHeart /> Pending for Ed</CardTitle>
                                <CardDescription>Forum entries directed specifically to Ed that need a response.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isLoading ? (
                            <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : (() => {
                            const pendingForEd = allJournalEntries.filter(entry => (!entry.feedback || entry.feedback.length === 0) && entry.recipient === 'Ed');
                            return pendingForEd.length > 0 ? renderPendingForumList(pendingForEd) : (
                                <p className="text-muted-foreground text-center p-8">No pending questions for Ed.</p>
                            );
                        })()}
                    </CardContent>
                </Card>

                {/* GENERAL PENDING SECTION */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2"><BookHeart /> General Pending Forum Entries</CardTitle>
                                <CardDescription>Review and respond to general entries in the forum.</CardDescription>
                            </div>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/faq">Go to The Forum</Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : (() => {
                            const pendingOthers = allJournalEntries.filter(entry => (!entry.feedback || entry.feedback.length === 0) && entry.recipient !== 'Ed');
                            return pendingOthers.length > 0 ? renderPendingForumList(pendingOthers) : (
                               <p className="text-muted-foreground text-center p-8">There are currently no other pending forum questions.</p>
                            );
                        })()}
                    </CardContent>
                </Card>

                <Card id="manual-faq-entry">
                    <CardHeader>
                        <CardTitle>Ed's Manual Forum Entry</CardTitle>
                        <CardDescription>
                            Add a Forum entry from an external source, like an email.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="contributorName">Contributor's Name</Label>
                            <Input id="contributorName" placeholder="e.g., John Doe" value={manualFaqData.contributorName} onChange={handleManualFaqChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" placeholder="e.g., Fear" value={manualFaqData.subject} onChange={handleManualFaqChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="question">Question</Label>
                            <FormattingToolbar textareaRef={manualFaqQuestionRef} value={manualFaqData.question} onValueChange={(val) => setManualFaqData(prev => ({...prev, question: val}))} />
                            <Textarea ref={manualFaqQuestionRef} id="question" placeholder="Paste the question here." rows={5} value={manualFaqData.question} onChange={handleManualFaqChange} />
                        </div>
                         <ImageUploader imageUrl={manualFaqData.imageUrl} onImageUrlChange={(url) => handleManualFaqImageUrlChange(url, 'question')} userId={user?.uid} label="Question Image (Optional)" />
                         <div className="space-y-2">
                            <Label htmlFor="questionCaption">Question Caption</Label>
                            <FormattingToolbar textareaRef={manualFaqQuestionCaptionRef} value={manualFaqData.questionCaption} onValueChange={(val) => setManualFaqData(p => ({...p, questionCaption: val}))} />
                            <Textarea ref={manualFaqQuestionCaptionRef} id="questionCaption" placeholder="Caption for question image or text" value={manualFaqData.questionCaption} onChange={handleManualFaqChange} rows={2}/>
                         </div>

                        <div className="space-y-2">
                            <Label htmlFor="answer">Answer (Your Feedback)</Label>
                            <FormattingToolbar textareaRef={manualFaqAnswerRef} value={manualFaqData.answer} onValueChange={(val) => setManualFaqData(prev => ({...prev, answer: val}))} />
                            <Textarea ref={manualFaqAnswerRef} id="answer" placeholder="Write your answer/feedback here." rows={5} value={manualFaqData.answer} onChange={handleManualFaqChange} />
                        </div>
                        <ImageUploader imageUrl={manualFaqData.answerImageUrl} onImageUrlChange={(url) => handleManualFaqImageUrlChange(url, 'answer')} userId={user?.uid} label="Answer Image (Optional)" />
                         <div className="space-y-2">
                            <Label htmlFor="answerImageCredit">Answer Image Credit</Label>
                            <FormattingToolbar textareaRef={manualFaqAnswerCreditRef} value={manualFaqData.answerImageCredit} onValueChange={(val) => setManualFaqData(p => ({...p, answerImageCredit: val}))} />
                            <Textarea ref={manualFaqAnswerCreditRef} id="answerImageCredit" placeholder="e.g., Photo by Jane Doe" value={manualFaqData.answerImageCredit} onChange={handleManualFaqChange} rows={2} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="answerCaption">Answer Caption</Label>
                            <FormattingToolbar textareaRef={manualFaqAnswerCaptionRef} value={manualFaqData.answerCaption} onValueChange={(val) => setManualFaqData(p => ({...p, answerCaption: val}))} />
                            <Textarea ref={manualFaqAnswerCaptionRef} id="answerCaption" placeholder="Caption for answer image or text" value={manualFaqData.answerCaption} onChange={handleManualFaqChange} rows={2}/>
                         </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleAddManualFaq} disabled={isAddingManualFaq}>
                            {isAddingManualFaq ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Add Forum Entry
                        </Button>
                    </CardFooter>
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
            {renderLockedTabTrigger("faq", "The Forum", 2)}
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
                    <CardTitle>Alignment Test</CardTitle>
                    <CardDescription>Review or update your answers. Your answers save automatically.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                {isFetchingAnswers ? (<p>Loading your answers...</p>) : (
                comprehensionQuestions.map((q, i) => (
                <div key={i} className="grid w-full gap-1.5">
                    <Label htmlFor={`question-${i}`}>{i + 1}. {q}</Label>
                    <Textarea id={`question-${i}`} rows={5} value={alignmentTestData.answers[q] || ''} onChange={(e) => handleAnswerChange(q, e.target.value)} placeholder="Your answer..." disabled={isLoading || isEvaluating} />
                </div>
                ))
                )}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 justify-between items-center">
                  <div>
                    {isSavingAnswers && <span className="text-sm text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</span>}
                  </div>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={handleReceiveFeedback} disabled={isLoading || isEvaluating}>
                                {isEvaluating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating...</> : 'Receive Feedback from The Chief'}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>You can check your answers at any time.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                </CardFooter>
                {alignmentTestData.latestFeedback && (
                <CardContent>
                <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle className="flex justify-between">
                    <span>You Receive Guidance</span>
                    <span className="text-sm font-normal text-muted-foreground">{isClient ? new Date(alignmentTestData.latestFeedback.createdAt).toLocaleString() : '...'}</span>
                    </AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap">{alignmentTestData.latestFeedback.feedback}</AlertDescription>
                </Alert>
                </CardContent>
                )}
            </Card>
        </TabsContent>
        <TabsContent value="faq" className="m-0">
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

        {Number(userLevel) < 4 ? renderExplorerView() : renderMemberChiefView()}

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
