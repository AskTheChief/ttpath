
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getLegacyUsers, type LegacyUser } from '@/ai/flows/get-legacy-users';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GoogleMap, useLoadScript, MarkerF, Libraries } from '@react-google-maps/api';

const libraries: Libraries = ['places'];
const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

const center = {
  lat: 45.0,
  lng: 10.0,
};

export default function CrmPage() {
  const [users, setUsers] = useState<LegacyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    async function fetchUsers() {
      try {
        const result = await getLegacyUsers();
        if (result.success && result.users) {
          setUsers(result.users);
        } else {
          throw new Error(result.message || 'Failed to load user data.');
        }
      } catch (error: any) {
        console.error("CRM Page Error:", error); // Log the full error to the console
        toast({
          variant: "destructive",
          title: "Error Loading Data",
          description: `An error occurred: ${error.message}. Check the console for more details.`,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [toast]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
       <div className="flex items-center justify-between">
         <h1 className="text-3xl font-bold">CRM - Legacy User Data</h1>
         <Button asChild variant="outline">
            <Link href="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
            </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User Location Map</CardTitle>
          <CardDescription>A map showing the distribution of your legacy members.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}
          {!loading && isLoaded && (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              zoom={2}
              center={center}
            >
              {users.map(user => 
                user.lat && user.lng && (
                  <MarkerF key={user.email} position={{ lat: user.lat, lng: user.lng }} title={user.name} />
                )
              )}
            </GoogleMap>
          )}
          {loadError && <div>Error loading maps. Please check your API key.</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Data Manager</CardTitle>
            <CardDescription>
                This table displays the user data parsed from your `UserContact.sql` file. We can now work on cleaning, homogenizing, and visualizing this data.
            </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-4">Loading and parsing user data...</p>
             </div>
          ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Country</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map(user => (
                        <TableRow key={user.email}>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.location}</TableCell>
                            <TableCell>{user.country}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
