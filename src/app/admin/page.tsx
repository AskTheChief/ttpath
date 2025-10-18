
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquare, Users, Mail, ArrowLeft, TestTube2 } from 'lucide-react';

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
        <Link href="/admin/dev-den">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-6 w-6" />
                Dev Den
              </CardTitle>
              <CardDescription>
                Access developer tools, testing utilities, and user answer logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>Enter Dev Den</Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
