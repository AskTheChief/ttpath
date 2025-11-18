
'use client';

import { useState, useEffect, Suspense } from 'react';
import { GoogleMap, useLoadScript, MarkerF, Libraries } from '@react-google-maps/api';
import { getTribes } from '@/ai/flows/get-tribes';
import { getUsers } from '@/ai/flows/get-users';
import { getTribeMembers } from '@/ai/flows/get-tribe-members';
import { getMeetingReports } from '@/ai/flows/get-meeting-reports';
import type { GetTribesOutput, TribeMember, MeetingReport, User as UserProfile } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 39.8283,
  lng: -98.5795,
};

const libraries: Libraries = ['places'];
const devEmails = ['tt_95@yahoo.com', 'zizseykota@gmail.com'];

function AdminTribesMapContent() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [tribes, setTribes] = useState<GetTribesOutput>([]);
  const [selectedTribe, setSelectedTribe] = useState<GetTribesOutput[0] | null>(null);
  const [tribeDetails, setTribeDetails] = useState<{ members: TribeMember[], reports: MeetingReport[], chiefProfile?: UserProfile } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isDev, setIsDev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      const isDeveloper = !!currentUser && devEmails.includes(currentUser.email || '');
      setIsDev(isDeveloper);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDev) {
      async function fetchTribes() {
        try {
          const fetchedTribes = await getTribes({});
          setTribes(fetchedTribes.filter(t => t.lat && t.lng));
        } catch(e) {
          console.error(e);
          toast({ variant: 'destructive', title: 'Could not fetch tribes' });
        }
      }
      fetchTribes();
    }
  }, [isDev, toast]);

  const handleMarkerClick = async (tribe: GetTribesOutput[0]) => {
    if (!user) return;
    setSelectedTribe(tribe);
    setDetailsLoading(true);
    setTribeDetails(null);
    try {
      const idToken = await user.getIdToken();
      const [members, reports, users] = await Promise.all([
        getTribeMembers({ tribeId: tribe.id, idToken }),
        getMeetingReports({ tribeId: tribe.id, idToken }),
        getUsers(),
      ]);

      const chiefProfile = users.find(u => u.uid === tribe.chief);
      
      setTribeDetails({ members, reports, chiefProfile });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error fetching tribe details',
        description: error.message || 'An unknown error occurred',
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!isDev) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
        <Button asChild variant="link" className="mt-4"><Link href="/admin">Back to Admin</Link></Button>
      </div>
    );
  }

  const renderMap = () => (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={2}
      center={center}
      options={{
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
      }}
      onClick={() => setSelectedTribe(null)}
    >
      {tribes.map((tribe) => (
        <MarkerF
          key={tribe.id}
          position={{ lat: tribe.lat!, lng: tribe.lng! }}
          onClick={() => handleMarkerClick(tribe)}
        />
      ))}
    </GoogleMap>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm z-10 p-4 flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-bold">Developer Tribes Map</h1>
            <p className="text-muted-foreground">Click a tribe to view its full details.</p>
         </div>
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
          </Link>
        </Button>
      </header>
      <main className="flex-grow flex relative">
        <div className="flex-grow">
          {loadError && <div className="h-full flex items-center justify-center">Error loading maps. Please check your API key setup.</div>}
          {isLoaded ? renderMap() : <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}
        </div>
        
        {selectedTribe && (
          <div className="absolute top-4 right-4 w-full max-w-md z-10">
            <Card className="max-h-[calc(100vh-5rem)] flex flex-col">
              <CardHeader>
                <CardTitle>{selectedTribe.name}</CardTitle>
                <CardDescription>{selectedTribe.location}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  {detailsLoading ? (
                    <div className="flex justify-center items-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : tribeDetails ? (
                    <Accordion type="multiple" defaultValue={['chief', 'members']} className="w-full">
                      <AccordionItem value="chief">
                        <AccordionTrigger>Chief Information</AccordionTrigger>
                        <AccordionContent>
                          {tribeDetails.chiefProfile ? (
                            <div className="text-sm">
                              <p><strong>Name:</strong> {tribeDetails.chiefProfile.firstName} {tribeDetails.chiefProfile.lastName}</p>
                              <p><strong>Email:</strong> {tribeDetails.chiefProfile.email}</p>
                              <p><strong>Phone:</strong> {tribeDetails.chiefProfile.phone}</p>
                            </div>
                          ) : <p className="text-sm text-muted-foreground">Chief profile not found.</p>}
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="members">
                        <AccordionTrigger>Members ({tribeDetails.members.length})</AccordionTrigger>
                        <AccordionContent>
                          {tribeDetails.members.length > 0 ? (
                            <ul className="space-y-2">
                              {tribeDetails.members.map(member => (
                                <li key={member.uid} className="text-sm border-b pb-1">
                                  <p>{member.firstName} {member.lastName} ({member.email})</p>
                                </li>
                              ))}
                            </ul>
                          ) : <p className="text-sm text-muted-foreground">No members in this tribe.</p>}
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="meetings">
                        <AccordionTrigger>Meetings ({selectedTribe.meetings?.length || 0})</AccordionTrigger>
                        <AccordionContent>
                           {selectedTribe.meetings && selectedTribe.meetings.length > 0 ? (
                            <ul className="space-y-2">
                              {selectedTribe.meetings.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(meeting => (
                                <li key={meeting.id} className="text-sm">
                                  {format(new Date(meeting.date), "PPP p")}
                                </li>
                              ))}
                            </ul>
                          ) : <p className="text-sm text-muted-foreground">No meetings scheduled.</p>}
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="reports">
                        <AccordionTrigger>Meeting Reports ({tribeDetails.reports.length})</AccordionTrigger>
                        <AccordionContent>
                           {tribeDetails.reports.length > 0 ? (
                             <Accordion type="single" collapsible className="w-full">
                              {tribeDetails.reports.map(report => (
                                <AccordionItem key={report.id} value={report.id}>
                                  <AccordionTrigger className="text-sm py-2">
                                    Report from {report.userName} on {format(new Date(report.submittedAt), "P")}
                                  </AccordionTrigger>
                                  <AccordionContent className="whitespace-pre-wrap text-xs">
                                    {report.reportContent}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                              </Accordion>
                          ) : <p className="text-sm text-muted-foreground">No reports submitted.</p>}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ) : <p>No details found.</p>}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminTribesMapPage() {
    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>}>
            <AdminTribesMapContent />
        </Suspense>
    )
}
