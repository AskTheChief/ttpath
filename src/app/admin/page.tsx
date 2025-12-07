
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquare, Users, Mail, ArrowLeft, FileQuestion, BarChart, Map, FileText, Database } from 'lucide-react';

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
        <Link href="/admin/users">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                User Management
              </CardTitle>
              <CardDescription>
                View user profiles and their contact information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>View Users</Button>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/chief-qa">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6" />
                Chief Q&A
              </CardTitle>
              <CardDescription>
                See all interactions users have had with The Chief.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>View Sessions</Button>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/feedback">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-6 w-6" />
                User Feedback
              </CardTitle>
              <CardDescription>
                See all feedback submitted by users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>View Feedback</Button>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/tutorial-answers">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="h-6 w-6" />
                Comprehension Test Answers
              </CardTitle>
              <CardDescription>
                Review all user submissions for the comprehension test.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>View Answers</Button>
            </CardContent>
          </Card>
        </Link>
         <Link href="/admin/crm">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-6 w-6" />
                CRM / Data Manager
              </CardTitle>
              <CardDescription>
                View and manage legacy user data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>Manage Data</Button>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/user-metrics">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-6 w-6" />
                User Metrics
              </CardTitle>
              <CardDescription>
                Visualize user sign-ups and activity over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>View Metrics</Button>
            </CardContent>
          </Card>
        </Link>
         <Link href="/admin/tribes-map">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-6 w-6" />
                Tribes Map
              </CardTitle>
              <CardDescription>
                (Devs Only) View detailed information for all tribes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>View Map</Button>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/reports">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                All Meeting Reports
              </CardTitle>
              <CardDescription>
                View all submitted meeting reports chronologically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>View Reports</Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
