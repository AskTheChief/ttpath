
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getTribes } from '@/ai/flows/get-tribes';
import { getTribeMembers } from '@/ai/flows/get-tribe-members';
import { getMeetingReports } from '@/ai/flows/get-meeting-reports';
import type { Tribe, TribeMember, MeetingReport } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Loader2, Users, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

function TribeDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const tribeId = params.tribeId as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tribe, setTribe] = useState<Tribe | null>(null);
  const [members, setMembers] = useState<TribeMember[]>([]);
  const [reports, setReports] = useState<MeetingReport[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (!currentUser) {
        // The admin layout will handle redirection if not authorized.
        // This is just a safeguard.
        setLoading(false);
        return;
      }
      
      if (tribeId) {
        try {
          const idToken = await currentUser.getIdToken();
          const [allTribes, tribeMembers, meetingReports] = await Promise.all([
            getTribes({}),
            getTribeMembers({ tribeId, idToken }),
            getMeetingReports({ tribeId, idToken })
          ]);
          
          const currentTribe = allTribes.find(t => t.id === tribeId);
          if (currentTribe) {
             setTribe({
                ...currentTribe,
                meetings: (currentTribe.meetings || []).map(m => ({ ...m, date: new Date(m.date) })),
             } as Tribe);
          }
          
          setMembers(tribeMembers);
          setReports(meetingReports);

        } catch (error) {
          console.error("Error fetching tribe details:", error);
        } finally {
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [tribeId]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!tribe) {
      return (
          <div className="h-screen flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold mb-4">Tribe Not Found</h1>
            <p>Could not retrieve details for this tribe.</p>
            <Button asChild variant="link" className="mt-4"><button onClick={() => router.push('/admin/tribes-map')}>Back to Map</button></Button>
          </div>
      )
  }
  
  const upcomingMeetings = tribe.meetings.filter(m => m.date >= new Date()).sort((a,b) => a.date.getTime() - b.date.getTime());
  const pastMeetings = tribe.meetings.filter(m => m.date < new Date()).sort((a,b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
       <div className="flex items-center justify-between mb-8">
        <div>
           <h1 className="text-3xl font-bold">{tribe.name}</h1>
           <p className="text-muted-foreground">{tribe.location}</p>
        </div>
         <Button asChild variant="outline">
            <button onClick={() => router.push('/admin/tribes-map')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Map
            </button>
        </Button>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users />Tribe Members ({members.length})</CardTitle>
            <CardDescription>All members of the tribe and their profile information.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {members.map(member => (
                <AccordionItem key={member.uid} value={member.uid}>
                  <AccordionTrigger>{member.uid === tribe.chief ? 'Chief: ' : ''}{member.firstName} {member.lastName}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p className="text-sm"><span className="font-semibold">Email:</span> {member.email}</p>
                      <p className="text-sm"><span className="font-semibold">Phone:</span> {member.phone}</p>
                      <p className="text-sm"><span className="font-semibold">Issue:</span> {member.issue || 'Not specified'}</p>
                      <p className="text-sm"><span className="font-semibold">Service Project:</span> {member.serviceProject || 'Not specified'}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar />Meetings</CardTitle>
                <CardDescription>Scheduled meetings for {tribe.name}.</CardDescription>
            </CardHeader>
            <CardContent>
                 <h3 className="font-semibold mb-2">Upcoming Meetings</h3>
                 {upcomingMeetings.length > 0 ? (
                    <ul className="space-y-2 mb-6">{upcomingMeetings.map(meeting => (<li key={meeting.id} className="p-2 border rounded-md font-medium">{format(meeting.date, 'PPP p')}</li>))}</ul>
                 ) : (<p className="text-sm text-center text-muted-foreground bg-gray-50 p-4 rounded-md mb-6">No upcoming meetings.</p>)}

                 <h3 className="font-semibold mb-2">Past Meetings</h3>
                 {pastMeetings.length > 0 ? (
                    <ul className="space-y-2">{pastMeetings.map(meeting => (<li key={meeting.id} className="p-2 border rounded-md font-medium">{format(meeting.date, 'PPP p')}</li>))}</ul>
                 ) : (<p className="text-sm text-center text-muted-foreground bg-gray-50 p-4 rounded-md">No past meetings.</p>)}
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText />Meeting Reports</CardTitle>
                <CardDescription>All submitted reports from tribe members.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                {reports.map(report => (
                    <AccordionItem key={report.id} value={report.id}>
                    <AccordionTrigger>
                        <div className="flex flex-col items-start text-left">
                           <span className="font-medium">Report from {report.userName}</span>
                           <span className="text-sm text-muted-foreground">Meeting: {format(new Date(report.submittedAt), 'PPP')}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p className="whitespace-pre-wrap">{report.reportContent}</p>
                    </AccordionContent>
                    </AccordionItem>
                ))}
                {reports.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No reports found for this tribe.</p>}
                </Accordion>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TribeDetailsPage() {
    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>}>
            <TribeDetailsContent />
        </Suspense>
    )
}
