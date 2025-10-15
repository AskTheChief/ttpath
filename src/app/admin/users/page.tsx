
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import UserTable from '@/components/admin/user-table';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function UsersPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
       <div className="flex items-center justify-between">
         <h1 className="text-3xl font-bold">User Management</h1>
         <Button asChild variant="outline">
            <Link href="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
            </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User Profiles</CardTitle>
          <CardDescription>A list of all registered users and their contact information.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserTable />
        </CardContent>
      </Card>
    </div>
  );
}
