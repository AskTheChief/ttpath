
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquare, Users, Mail, ArrowLeft, FileQuestion, BarChart, Map, FileText, Database, Inbox, Send, BookHeart } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Path
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <Card className="relative flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              User Management
            </CardTitle>
            <CardDescription>
              View user profiles and their contact information.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button tabIndex={-1}>View Users</Button>
          </CardContent>
          <Link href="/admin/users" className="absolute inset-0 z-10" aria-label="View User Management">
            <span className="sr-only">User Management</span>
          </Link>
        </Card>

        <Card className="relative flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Chief Q&A
            </CardTitle>
            <CardDescription>
              See all interactions users have had with The Chief.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button tabIndex={-1}>View Sessions</Button>
          </CardContent>
          <Link href="/admin/chief-qa" className="absolute inset-0 z-10" aria-label="View Chief Q&A">
            <span className="sr-only">Chief Q&A</span>
          </Link>
        </Card>

        <Card className="relative flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-6 w-6" />
              User Feedback
            </CardTitle>
            <CardDescription>
              See all feedback submitted by users.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button tabIndex={-1}>View Feedback</Button>
          </CardContent>
          <Link href="/admin/feedback" className="absolute inset-0 z-10" aria-label="View User Feedback">
            <span className="sr-only">User Feedback</span>
          </Link>
        </Card>

        <Card className="relative flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-6 w-6" />
              Alignment Test Answers
            </CardTitle>
            <CardDescription>
              Review all user submissions for the alignment test.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button tabIndex={-1}>View Answers</Button>
          </CardContent>
          <Link href="/admin/tutorial-answers" className="absolute inset-0 z-10" aria-label="View Alignment Test Answers">
            <span className="sr-only">Alignment Test Answers</span>
          </Link>
        </Card>
        
        <Card className="relative flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              CRM / Data Manager
            </CardTitle>
            <CardDescription>
              View and manage legacy user data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button tabIndex={-1}>Manage Data</Button>
          </CardContent>
          <Link href="/admin/crm" className="absolute inset-0 z-10" aria-label="Open CRM / Data Manager">
            <span className="sr-only">CRM / Data Manager</span>
          </Link>
        </Card>

        <Card className="relative flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-6 w-6" />
              User Metrics
            </CardTitle>
            <CardDescription>
              Visualize user sign-ups and activity over time.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button tabIndex={-1}>View Metrics</Button>
          </CardContent>
          <Link href="/admin/user-metrics" className="absolute inset-0 z-10" aria-label="View User Metrics">
            <span className="sr-only">User Metrics</span>
          </Link>
        </Card>
        
        <Card className="relative flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-6 w-6" />
              Tribes Map
            </CardTitle>
            <CardDescription>
              (Devs Only) View detailed information for all tribes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button tabIndex={-1}>View Map</Button>
          </CardContent>
          <Link href="/admin/tribes-map" className="absolute inset-0 z-10" aria-label="View Tribes Map">
            <span className="sr-only">Tribes Map</span>
          </Link>
        </Card>

        <Card className="relative flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              All Meeting Reports
            </CardTitle>
            <CardDescription>
              View all submitted meeting reports chronologically.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button tabIndex={-1}>View Reports</Button>
          </CardContent>
          <Link href="/admin/reports" className="absolute inset-0 z-10" aria-label="View All Meeting Reports">
            <span className="sr-only">All Meeting Reports</span>
          </Link>
        </Card>

        <Card className="relative flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookHeart className="h-6 w-6" />
              The Forum
            </CardTitle>
            <CardDescription>
              Review and provide feedback on forum entries.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button tabIndex={-1}>Review Entries</Button>
          </CardContent>
          <Link href="/admin/journal-entries" className="absolute inset-0 z-10" aria-label="Review The Forum Entries">
            <span className="sr-only">The Forum</span>
          </Link>
        </Card>
        
        <Card className="relative flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-6 w-6" />
              CRM Inbox
            </CardTitle>
            <CardDescription>
              View emails sent to your app from users.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button tabIndex={-1}>Open Inbox</Button>
          </CardContent>
          <Link href="/admin/inbox" className="absolute inset-0 z-10" aria-label="Open CRM Inbox">
            <span className="sr-only">CRM Inbox</span>
          </Link>
        </Card>

        <Card className="relative flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-6 w-6" />
              CRM Outbox
            </CardTitle>
            <CardDescription>
              View a log of all emails sent from your app.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button tabIndex={-1}>Open Outbox</Button>
          </CardContent>
          <Link href="/admin/outbox" className="absolute inset-0 z-10" aria-label="Open CRM Outbox">
            <span className="sr-only">CRM Outbox</span>
          </Link>
        </Card>
      </div>
    </div>
  );
}
