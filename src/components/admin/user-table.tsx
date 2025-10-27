
"use client";

import { useEffect, useState } from 'react';
import { getUsers, type User } from '@/ai/flows/get-users';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateUserLevel } from '@/ai/flows/update-user-level';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const levelMap: Record<number, string> = {
  1: "Visitor",
  2: "Guest",
  3: "Graduate",
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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Last Name</TableHead>
          <TableHead>First Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Level</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center">Loading users...</TableCell>
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
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="text-center">No users found.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
