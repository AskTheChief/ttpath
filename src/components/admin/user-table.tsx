
"use client";

import { useEffect, useState } from 'react';
import { getUsers, type User } from '@/ai/flows/get-users';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateUserLevel } from '@/ai/flows/update-user-level';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Trash2, GraduationCap } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { deleteUser } from '@/ai/flows/delete-user';
import { sendDiplomaEmail } from '@/ai/flows/send-diploma-email';


const levelMap: Record<number, string> = {
  1: "Visitor",
  2: "Guest",
  3: "Explorer",
  4: "Member",
  5: "Chief",
  6: "Mentor",
};

export default function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setAdminUser(user);
    });
    return () => unsubscribe();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const userData = await getUsers();
      setUsers(userData);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleLevelChange = async (targetUserId: string, newLevelStr: string) => {
    const newLevel = parseInt(newLevelStr, 10);
    if (!adminUser) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in as an admin.'});
        return;
    }
    
    try {
        const idToken = await adminUser.getIdToken(true);
        const result = await updateUserLevel({ idToken, targetUserId, newLevel });
        if (result.success) {
            toast({ title: 'Success', description: 'User level updated.' });
            // Optimistically update UI
            setUsers(prevUsers => prevUsers.map(u => u.uid === targetUserId ? {...u, currentUserLevel: newLevel} : u));
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    }
  };

  const handleDeleteUser = async (targetUserId: string, targetUserName: string) => {
    if (!adminUser) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in as an admin.'});
        return;
    }

    try {
        const idToken = await adminUser.getIdToken(true);
        const result = await deleteUser({ idToken, targetUserId });
        if (result.success) {
            toast({ title: 'Success', description: `${targetUserName} has been deleted.` });
            setUsers(prevUsers => prevUsers.filter(u => u.uid !== targetUserId));
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
    }
  };

  const handleResendDiploma = async (user: User) => {
    if (!user.email || !user.firstName) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'User email or name is missing.' });
        return;
    }
    toast({ title: 'Sending Diploma...', description: `Sending to ${user.email}.` });
    try {
        const result = await sendDiplomaEmail({
            recipientEmail: user.email,
            recipientName: `${user.firstName} ${user.lastName || ''}`.trim(),
        });
        if (result.success) {
            toast({ title: 'Diploma Sent!', description: `A new diploma has been sent to ${user.email}.` });
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Send Failed', description: error.message });
    }
  };


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Last Name</TableHead>
          <TableHead>First Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Level</TableHead>
          <TableHead>Account Visits</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center">Loading users...</TableCell>
          </TableRow>
        ) : users.length > 0 ? (
          users.map(user => (
            <TableRow key={user.uid}>
              <TableCell>{user.lastName || 'N/A'}</TableCell>
              <TableCell>{user.firstName || 'N/A'}</TableCell>
              <TableCell>{user.email || 'N/A'}</TableCell>
              <TableCell>{user.phone || 'N/A'}</TableCell>
              <TableCell>
                <Select
                  value={user.currentUserLevel?.toString()}
                  onValueChange={(value) => handleLevelChange(user.uid, value)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Set level" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(levelMap).map(([level, name]) => (
                        <SelectItem key={level} value={level}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>{user.myAccountVisits ?? 0}</TableCell>
              <TableCell className="text-right space-x-2">
                 <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleResendDiploma(user)}
                    disabled={(user.currentUserLevel || 0) < 3}
                    title="Resend Diploma"
                 >
                    <GraduationCap className="h-4 w-4" />
                 </Button>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                     <Button variant="destructive" size="icon" disabled={user.uid === adminUser?.uid}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete User</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the user <span className="font-bold">{user.firstName} {user.lastName}</span> and all associated data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteUser(user.uid, `${user.firstName} ${user.lastName}`)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="text-center">No users found.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
