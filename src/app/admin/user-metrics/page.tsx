
'use client';

import { useEffect, useState, useMemo } from 'react';
import { getUsers, type User } from '@/ai/flows/get-users';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function UserMetricsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const userData = await getUsers();
        setUsers(userData);
      } catch (error) {
        console.error("Error fetching users for metrics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const signupData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    users.forEach(user => {
      if (user.createdAt) {
        const date = format(parseISO(user.createdAt), 'yyyy-MM-dd');
        counts[date] = (counts[date] || 0) + 1;
      }
    });
    
    const sortedDates = Object.keys(counts).sort();
    let cumulative = 0;
    return sortedDates.map(date => {
      cumulative += counts[date];
      return {
        date,
        'New Signups': counts[date],
        'Total Users': cumulative,
      };
    });
  }, [users]);

  const activityData = useMemo(() => {
    return users
      .filter(u => u.myAccountVisits && u.myAccountVisits > 0)
      .map(user => ({
        name: `${user.firstName || 'User'} ${user.lastName?.[0] || ''}`.trim(),
        visits: user.myAccountVisits || 0,
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 20); // Show top 20 most active users
  }, [users]);


  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className="mt-4 text-muted-foreground">Loading user metrics...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Metrics</h1>
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Signups Over Time</CardTitle>
          <CardDescription>Tracks the daily number of new users and the cumulative total.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={signupData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="New Signups" stroke="#8884d8" activeDot={{ r: 8 }} />
              <Line yAxisId="right" type="monotone" dataKey="Total Users" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Page Visits</CardTitle>
          <CardDescription>Top 20 users by number of visits to their "My Account" page.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visits" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
