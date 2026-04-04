
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Loader2, X, Mail, Move, MousePointerClick, ArrowUpDown, Eye, Inbox, Send, Search, Check, UserPlus } from 'lucide-react';
import { getLegacyUsers, type LegacyUser } from '@/ai/flows/get-legacy-users';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GoogleMap, useLoadScript, MarkerF, Libraries, InfoWindowF, MarkerClustererF } from '@react-google-maps/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import EmailComposerModal from '@/components/modals/email-composer-modal';
import ViewRecordModal from '@/components/modals/view-record-modal';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AddContactModal from '@/components/modals/add-contact-modal';

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
  const [users, setUsers] = useState<LegacyUser[]>([]); // For map markers
  const [allUsers, setAllUsers] = useState<LegacyUser[]>([]); // For table and filtering
  const [filteredUsers, setFilteredUsers] = useState<LegacyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<LegacyUser | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<LegacyUser[]>([]);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<LegacyUser | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastName', direction: 'ascending' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customEmail, setCustomEmail] = useState('');

  const { toast } = useToast();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const result = await getLegacyUsers();
        if (result.success && result.users) {
          setAllUsers(result.users);
          setFilteredUsers(result.users);
          const usersForMap = result.users.filter(u => u.lat && u.lng);
          setUsers(usersForMap);
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

  const handleBoundsChanged = (mode?: boolean) => {
    const isSelectionActive = mode !== undefined ? mode : selectionMode;
    if (map && isSelectionActive) {
      const newBounds = map.getBounds();
      if (newBounds) {
        setSelectionBounds(newBounds);
      }
    }
  };

  useEffect(() => {
    if (selectionMode && selectionBounds) {
      const selected = allUsers.filter(user => {
        if (user.lat && user.lng) {
          return selectionBounds.contains({ lat: user.lat, lng: user.lng });
        }
        return false;
      });
      setFilteredUsers(selected);
      setSelectedRows({}); // Clear selection when map filter changes
    } else {
      setFilteredUsers(allUsers);
    }
  }, [selectionBounds, selectionMode, allUsers]);

  const toggleSelectionMode = () => {
    const newMode = !selectionMode;
    setSelectionMode(newMode);
    
    if (newMode) {
      toast({
        title: "Selection Mode Activated",
        description: "Pan and zoom the map to define your selection. The table will update automatically.",
      });
      handleBoundsChanged(newMode);
    } else {
      setSelectionBounds(null);
      setFilteredUsers(allUsers);
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

  const handleOpenEmailModalForCustom = () => {
      const email = customEmail.trim();
      if (!email || !email.includes('@')) {
          toast({ title: 'Please enter a valid email address.', variant: 'destructive' });
          return;
      }
      const name = email.split('@')[0];
      setEmailRecipients([{ email, firstName: name, lastName: '' } as LegacyUser]);
      setIsEmailModalOpen(true);
      setCustomEmail('');
  };

  const handleViewRecord = (user: LegacyUser) => {
    setViewingUser(user);
    setIsRecordModalOpen(true);
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

    if (searchQuery.trim() !== '') {
        const lowercasedQuery = searchQuery.toLowerCase();
        sortableItems = sortableItems.filter(user =>
            (user.firstName?.toLowerCase().includes(lowercasedQuery)) ||
            (user.lastName?.toLowerCase().includes(lowercasedQuery)) ||
            (user.email?.toLowerCase().includes(lowercasedQuery))
        );
    }

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
  }, [filteredUsers, sortConfig, searchQuery]);

  const SortableHeader = ({ title, sortKey }: { title: string; sortKey: keyof LegacyUser; }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <TableHead>
            <Button variant="ghost" onClick={() => requestSort(sortKey)}>
                {title}
                <ArrowUpDown className={`ml-2 h-4 w-4 ${isSorted ? 'text-foreground' : 'text-muted-foreground/50'}`} />
            </Button>
        </TableHead>
    );
  };

  const numSelectedRows = Object.values(selectedRows).filter(Boolean).length;
  const totalInView = selectionMode ? filteredUsers.length : allUsers.length;
  
  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
         <div className="flex items-center justify-between">
           <h1 className="text-3xl font-bold">CRM / Data Manager</h1>
            <div className="flex items-center gap-2">
               <Button onClick={() => setIsAddContactModalOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Contact
              </Button>
              <Button asChild variant="outline">
                  <Link href="/admin/outbox">
                      <Send className="h-4 w-4 mr-2" />
                      Open Outbox
                  </Link>
              </Button>
              <Button asChild variant="outline">
                  <Link href="/admin/inbox">
                      <Inbox className="h-4 w-4 mr-2" />
                      Open Inbox
                  </Link>
              </Button>
              <Button asChild variant="outline">
                  <Link href="/admin">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Admin
                  </Link>
              </Button>
            </div>
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
                  Use this map to visually filter users by location. Activate 'Select Users' mode to draw a selection area on the map.
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
                onBoundsChanged={() => handleBoundsChanged()}
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>
                        Data Manager
                    </CardTitle>
                    <CardDescription>
                      Showing {sortedUsers.length} of {totalInView} users. {selectionMode ? `(Filtered by map)` : ''}
                    </CardDescription>
                  </div>
                  <div className="flex w-full sm:w-auto items-center gap-2">
                        <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                              type="search"
                              placeholder="Search name or email..."
                              className="w-full pl-10"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                          />
                      </div>
                      {numSelectedRows > 0 && (
                          <Button onClick={handleOpenEmailModalForGroup} className="shrink-0">
                              <Mail className="mr-2 h-4 w-4" />
                              Email ({numSelectedRows})
                          </Button>
                      )}
                      <div className="flex gap-2 shrink-0">
                          <Input
                              type="email"
                              placeholder="Custom email..."
                              className="w-48"
                              value={customEmail}
                              onChange={(e) => setCustomEmail(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleOpenEmailModalForCustom()}
                          />
                          <Button variant="outline" onClick={handleOpenEmailModalForCustom}>
                              <Send className="mr-2 h-4 w-4" />
                              Send
                          </Button>
                      </div>
                  </div>
              </div>
          </CardHeader>
          <CardContent>
            {loading ? (
               <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="ml-4">Loading user data...</p>
               </div>
            ) : (
              <ScrollArea className="w-full whitespace-nowrap">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={sortedUsers.length > 0 && numSelectedRows === sortedUsers.length}
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <SortableHeader title="First Name" sortKey="firstName" />
                            <SortableHeader title="Last Name" sortKey="lastName" />
                            <SortableHeader title="Email" sortKey="email" />
                            <TableHead>Reached Out</TableHead>
                            <SortableHeader title="City" sortKey="city" />
                            <SortableHeader title="State" sortKey="state" />
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedUsers.map((user, index) => (
                            <TableRow key={`${user.email}-${index}`} data-state={user.email && selectedRows[user.email] ? 'selected' : ''}>
                                <TableCell>
                                    <Checkbox
                                        checked={!!(user.email && selectedRows[user.email])}
                                        onCheckedChange={(checked) => user.email && handleRowSelect(user.email, !!checked)}
                                        aria-label={`Select ${user.firstName} ${user.lastName}`}
                                    />
                                </TableCell>
                                <TableCell>{user.firstName}</TableCell>
                                <TableCell>{user.lastName}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>
                                <TableCell>
                                    {user.reachouts === '1' && (
                                        <Check className="h-5 w-5 text-green-500" />
                                    )}
                                </TableCell>
                                <TableCell>{user.city}</TableCell>
                                <TableCell>{user.state}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => handleViewRecord(user)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        View
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleOpenEmailModalForSingleUser(user)}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Email
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {sortedUsers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
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
      {viewingUser && (
        <ViewRecordModal
          isOpen={isRecordModalOpen}
          onClose={() => setViewingUser(null)}
          userRecord={viewingUser}
        />
      )}
      <AddContactModal 
        isOpen={isAddContactModalOpen} 
        onClose={() => setIsAddContactModalOpen(false)} 
        adminUser={currentUser}
        onContactAdded={() => {
            // The CRM page shows legacy data from a static file.
            // New contacts are added to Firestore and will appear on the /admin/users page.
            // A success toast is shown inside the modal.
        }}
      />
    </>
  );
}
