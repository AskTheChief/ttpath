
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import UserTable from '@/components/admin/user-table';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { normalizePhoneNumbers } from '@/ai/flows/normalize-phone-numbers';
import { useToast } from '@/hooks/use-toast';
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

export default function UsersPage() {
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force-refresh the UserTable
  const { toast } = useToast();

  const handleNormalizePhones = async () => {
    setIsNormalizing(true);
    try {
      const result = await normalizePhoneNumbers();
      if (result.success) {
        toast({
          title: "Normalization Complete",
          description: result.message,
        });
        if (result.updatedCount > 0) {
           setRefreshKey(prevKey => prevKey + 1); // Trigger re-render of UserTable
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Normalization Failed",
        description: error.message,
      });
    } finally {
      setIsNormalizing(false);
    }
  };

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Profiles</CardTitle>
            <CardDescription>A list of all registered users, their stats, and contact information.</CardDescription>
          </div>
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" disabled={isNormalizing}>
                {isNormalizing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Normalize Phone Numbers
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will scan all user profiles and reformat their phone numbers to a standard format (e.g., +15555555555). This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleNormalizePhones}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent>
          <UserTable key={refreshKey} />
        </CardContent>
      </Card>
    </div>
  );
}
