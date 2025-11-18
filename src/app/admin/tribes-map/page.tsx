
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, useLoadScript, MarkerF, Libraries } from '@react-google-maps/api';
import { getTribes } from '@/ai/flows/get-tribes';
import type { GetTribesOutput } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 39.8283,
  lng: -98.5795,
};

const libraries: Libraries = ['places'];
const devEmails = ['tt_95@yahoo.com', 'zizseykota@gmail.com'];

function AdminTribesMapContent() {
  const router = useRouter();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [tribes, setTribes] = useState<GetTribesOutput>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isDev, setIsDev] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      const isDeveloper = !!currentUser && devEmails.includes(currentUser.email || '');
      setIsDev(isDeveloper);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDev) {
      async function fetchTribes() {
        try {
          const fetchedTribes = await getTribes({});
          setTribes(fetchedTribes.filter(t => t.lat && t.lng));
        } catch(e) {
          console.error(e);
          toast({ variant: 'destructive', title: 'Could not fetch tribes' });
        }
      }
      fetchTribes();
    }
  }, [isDev, toast]);

  const handleMarkerClick = (tribeId: string) => {
    router.push(`/admin/tribe-details/${tribeId}`);
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!isDev) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
        <Button asChild variant="link" className="mt-4"><Link href="/admin">Back to Admin</Link></Button>
      </div>
    );
  }

  const renderMap = () => (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={2}
      center={center}
      options={{
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
      }}
    >
      {tribes.map((tribe) => (
        <MarkerF
          key={tribe.id}
          position={{ lat: tribe.lat!, lng: tribe.lng! }}
          onClick={() => handleMarkerClick(tribe.id)}
        />
      ))}
    </GoogleMap>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm z-10 p-4 flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-bold">Developer Tribes Map</h1>
            <p className="text-muted-foreground">Click a tribe to view its full details.</p>
         </div>
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
          </Link>
        </Button>
      </header>
      <main className="flex-grow flex relative">
        <div className="flex-grow">
          {loadError && <div className="h-full flex items-center justify-center">Error loading maps. Please check your API key setup.</div>}
          {isLoaded ? renderMap() : <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}
        </div>
      </main>
    </div>
  );
}

export default function AdminTribesMapPage() {
    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>}>
            <AdminTribesMapContent />
        </Suspense>
    )
}
