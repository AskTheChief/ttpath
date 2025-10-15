
"use client";

import { useEffect, useState } from 'react';
import { getUsers, type User } from '@/ai/flows/get-users';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const userData = await getUsers();
        setUsers(userData);
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>First Name</TableHead>
          <TableHead>Last Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Email</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center">Loading users...</TableCell>
          </TableRow>
        ) : users.length > 0 ? (
          users.map(user => (
            <TableRow key={user.uid}>
              <TableCell>{user.firstName || 'N/A'}</TableCell>
              <TableCell>{user.lastName || 'N/A'}</TableCell>
              <TableCell>{user.phone || 'N/A'}</TableCell>
              <TableCell>{user.email || 'N/A'}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="text-center">No users found.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
