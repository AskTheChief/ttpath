
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquare, Users, Mail } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/dev-den">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                User Management
              </CardTitle>
              <CardDescription>
                View user profiles and their interactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>Go to Dev Den</Button>
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
      </div>
    </div>
  );
}
