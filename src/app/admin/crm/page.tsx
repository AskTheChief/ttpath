
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Loader2, X, Mail, Move, MousePointerClick, ArrowUpDown } from 'lucide-react';
import { getLegacyUsers, type LegacyUser } from '@/ai/flows/get-legacy-users';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GoogleMap, useLoadScript, MarkerF, Libraries, InfoWindowF, MarkerClustererF } from '@react-google-maps/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import EmailComposerModal from '@/components/modals/email-composer-modal';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

type SortConfig = {
  key: keyof LegacyUser;
  direction: 'ascending' | 'descending';
} | null;


export default function CrmPage() {
  const [users, setUsers] = useState<LegacyUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<LegacyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<LegacyUser | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<LegacyUser[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastName', direction: 'ascending' });
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
          const validUsers = result.users.filter(u => u.lat && u.lng);
          setUsers(validUsers);
          setFilteredUsers(validUsers);
        } else {
          throw new Error(result.message || 'Failed to load user data.');
        }
      } catch (error: any) {
        console.error("CRM Page Error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const handleBoundsChanged = () => {
    if (map && selectionMode) {
      const newBounds = map.getBounds();
      if (newBounds) {
        setSelectionBounds(newBounds);
      }
    }
  };

  useEffect(() => {
    if (selectionMode && selectionBounds) {
      const selected = users.filter(user => {
        if (user.lat && user.lng) {
          return selectionBounds.contains({ lat: user.lat, lng: user.lng });
        }
        return false;
      });
      setFilteredUsers(selected);
      setSelectedRows({}); // Clear selection when map filter changes
    } else {
      setFilteredUsers(users);
    }
  }, [selectionBounds, selectionMode, users]);

  const toggleSelectionMode = () => {
    const newMode = !selectionMode;
    setSelectionMode(newMode);
    
    if (newMode) {
      toast({
        title: "Selection Mode Activated",
        description: "Pan and zoom the map to define your selection. The table will update automatically.",
      });
      handleBoundsChanged();
    } else {
      setSelectionBounds(null);
      setFilteredUsers(users);
      if(map) {
        map.setZoom(2);
        map.setCenter(center);
      }
      toast({
          title: "Selection Cleared",
          description: "The map is back in normal navigation mode.",
      });
    }
  };
  
  const handleOpenEmailModalForSingleUser = (user: LegacyUser) => {
    setEmailRecipients([user]);
    setIsEmailModalOpen(true);
    setSelectedUser(null);
  };
  
  const handleOpenEmailModalForGroup = () => {
      const recipients = sortedUsers.filter(user => user.email && selectedRows[user.email]);
      if (recipients.length > 0) {
          setEmailRecipients(recipients);
          setIsEmailModalOpen(true);
      }
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelectedRows: Record<string, boolean> = {};
    if (checked) {
      sortedUsers.forEach(user => {
        if (user.email) newSelectedRows[user.email] = true;
      });
    }
    setSelectedRows(newSelectedRows);
  };

  const handleRowSelect = (email: string, checked: boolean) => {
    setSelectedRows(prev => ({
      ...prev,
      [email]: checked,
    }));
  };

  const requestSort = (key: keyof LegacyUser) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedUsers = useMemo(() => {
    let sortableItems = [...filteredUsers];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredUsers, sortConfig]);

  const SortableHeader = ({ title, sortKey }: { title: string; sortKey: keyof LegacyUser; }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <TableHead className="whitespace-nowrap">
            <Button variant="ghost" onClick={() => requestSort(sortKey)}>
                {title}
                <ArrowUpDown className={`ml-2 h-4 w-4 ${isSorted ? 'text-foreground' : 'text-muted-foreground/50'}`} />
            </Button>
        </TableHead>
    );
  };
  

  const numSelectedRows = Object.values(selectedRows).filter(Boolean).length;
  
  return (
    <>
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

        {error && (
          <Alert variant="destructive">
            <AlertTitle className="flex items-center justify-between">
              An Error Occurred
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setError(null)}>
                <X className="h-4 w-4" />
              </Button>
            </AlertTitle>
            <AlertDescription>
              <p className="mb-2">The following error was reported while trying to load user data:</p>
              <pre className="whitespace-pre-wrap bg-destructive/10 p-2 rounded-md font-mono text-xs text-destructive-foreground">
                {error}
              </pre>
            </AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader>
             <div className="flex justify-between items-start">
              <div>
                <CardTitle>User Location Map</CardTitle>
                <CardDescription>
                  {selectionMode 
                    ? "Selection Mode: Pan and zoom to select users. The table will update."
                    : "Pan & Zoom Mode: Click a cluster to zoom in, or a marker to see details."
                  }
                </CardDescription>
              </div>
               <div className="flex gap-2">
                 <Button variant="outline" onClick={toggleSelectionMode}>
                    {selectionMode ? <Move className="mr-2 h-4 w-4"/> : <MousePointerClick className="mr-2 h-4 w-4"/>}
                    {selectionMode ? 'Exit Select Mode' : 'Select Users'}
                 </Button>
               </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}
            {!loading && isLoaded && (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={2}
                center={center}
                onLoad={onMapLoad}
                onBoundsChanged={handleBoundsChanged}
              >
                <MarkerClustererF>
                  {(clusterer) =>
                    users.map((user, index) => 
                      user.lat && user.lng && (
                        <MarkerF 
                          key={`${user.email}-${index}`} 
                          position={{ lat: user.lat, lng: user.lng }} 
                          title={`${user.firstName} ${user.lastName}`}
                          clusterer={clusterer}
                          onClick={() => setSelectedUser(user)}
                        />
                      )
                    )
                  }
                </MarkerClustererF>

                {selectedUser && selectedUser.lat && selectedUser.lng && (
                  <InfoWindowF
                    position={{ lat: selectedUser.lat, lng: selectedUser.lng }}
                    onCloseClick={() => setSelectedUser(null)}
                  >
                    <div className="p-1 space-y-2">
                      <h4 className="font-bold">{selectedUser.firstName} {selectedUser.lastName}</h4>
                      <p className="text-sm">{selectedUser.location}</p>
                      <p className="text-sm text-blue-600">{selectedUser.email}</p>
                      <Button size="sm" className="w-full" onClick={() => handleOpenEmailModalForSingleUser(selectedUser)}>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                      </Button>
                    </div>
                  </InfoWindowF>
                )}
              </GoogleMap>
            )}
            {loadError && <div>Error loading maps. Please check your API key.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
              <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>
                        Data Manager {selectionMode && `(${filteredUsers.length} users selected)`}
                    </CardTitle>
                    <CardDescription>
                        {selectionMode ? 'Showing users in the selected map area.' : 'Use "Select Users" on the map to filter users by location.'}
                    </CardDescription>
                  </div>
                  {numSelectedRows > 0 && (
                      <Button onClick={handleOpenEmailModalForGroup}>
                          <Mail className="mr-2 h-4 w-4" />
                          Email Selected ({numSelectedRows})
                      </Button>
                  )}
              </div>
          </CardHeader>
          <CardContent>
            {loading ? (
               <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="ml-4">Loading user data...</p>
               </div>
            ) : (
             <ScrollArea className="w-full">
                <Table className="min-w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px] sticky left-0 bg-card z-10">
                                <Checkbox
                                    checked={sortedUsers.length > 0 && numSelectedRows === sortedUsers.length}
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <SortableHeader title="Last Name" sortKey="lastName" />
                            <SortableHeader title="First Name" sortKey="firstName" />
                            <SortableHeader title="Email" sortKey="email" />
                            <SortableHeader title="Phone" sortKey="phone" />
                            <SortableHeader title="Address" sortKey="address" />
                            <SortableHeader title="City" sortKey="city" />
                            <SortableHeader title="State" sortKey="state" />
                            <SortableHeader title="Zip" sortKey="zip" />
                            <SortableHeader title="Country" sortKey="country" />
                            <TableHead className="text-right sticky right-0 bg-card z-10">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedUsers.map((user, index) => (
                            <TableRow key={`${user.email}-${index}`} data-state={user.email && selectedRows[user.email] ? 'selected' : ''}>
                                <TableCell className="sticky left-0 bg-card z-10">
                                    <Checkbox
                                        checked={!!(user.email && selectedRows[user.email])}
                                        onCheckedChange={(checked) => user.email && handleRowSelect(user.email, !!checked)}
                                        aria-label={`Select ${user.firstName} ${user.lastName}`}
                                    />
                                </TableCell>
                                <TableCell>{user.lastName}</TableCell>
                                <TableCell>{user.firstName}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.phone}</TableCell>
                                <TableCell>{user.address}</TableCell>
                                <TableCell>{user.city}</TableCell>
                                <TableCell>{user.state}</TableCell>
                                <TableCell>{user.zip}</TableCell>
                                <TableCell>{user.country}</TableCell>
                                <TableCell className="text-right sticky right-0 bg-card z-10">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenEmailModalForSingleUser(user)}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Email
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                         {sortedUsers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center text-muted-foreground h-24">
                                    {selectionMode ? 'No users found in the current map view.' : 'No users to display.'}
                                </TableCell>
                            </TableRow>
                         )}
                    </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
      {emailRecipients.length > 0 && (
        <EmailComposerModal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            recipientEmails={emailRecipients.map(u => u.email).filter((e): e is string => !!e)}
            recipientNames={emailRecipients.map(u => `${u.firstName} ${u.lastName}`)}
        />
      )}
    </>
  );
}
