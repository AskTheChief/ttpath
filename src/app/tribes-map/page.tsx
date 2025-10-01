
'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript, MarkerClustererF, MarkerF } from '@react-google-maps/api';
import { getTribes } from '@/ai/flows/get-tribes';
import type { GetTribesOutput } from '@/ai/flows/get-tribes';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { joinTribe } from '@/ai/flows/join-tribe';
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

export default function TribesMapPage() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [tribes, setTribes] = useState<GetTribesOutput>([]);
  const [selectedTribe, setSelectedTribe] = useState<GetTribesOutput[0] | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchTribes() {
      const fetchedTribes = await getTribes({});
      setTribes(fetchedTribes.filter(t => t.lat && t.lng));
    }
    fetchTribes();
    
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleMarkerClick = (tribe: GetTribesOutput[0]) => {
    setSelectedTribe(tribe);
  };
  
  const handleJoinTribe = async (tribeId: string) => {
    try {
      const result = await joinTribe({ tribeId });
      if (result.success) {
        toast({
          title: 'Application Sent!',
          description: 'The tribe chief has been notified of your request.',
        });
        setSelectedTribe(null); // Close the info window
      } else {
        throw new Error('Failed to send application');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error joining tribe',
        description: error.message || 'An unknown error occurred',
      });
    }
  };

  const renderMap = () => (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={4}
      center={center}
      options={{
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
      }}
      onClick={() => setSelectedTribe(null)}
    >
      <MarkerClustererF>
        {(clusterer) =>
          tribes.map((tribe) => (
            <MarkerF
              key={tribe.id}
              position={{ lat: tribe.lat!, lng: tribe.lng! }}
              clusterer={clusterer}
              onClick={() => handleMarkerClick(tribe)}
            />
          ))
        }
      </MarkerClustererF>
    </GoogleMap>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm z-10 p-4 flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-bold">Tribes Map</h1>
            <p className="text-muted-foreground">Find a Tribe near you.</p>
         </div>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Path
          </Link>
        </Button>
      </header>
      <main className="flex-grow flex relative">
        <div className="flex-grow">
          {loadError && <div className="h-full flex items-center justify-center">Error loading maps. Please check your API key setup.</div>}
          {isLoaded ? renderMap() : <div className="h-full flex items-center justify-center">Loading...</div>}
        </div>
        
        {selectedTribe && (
          <div className="absolute top-4 right-4 w-full max-w-sm z-10">
            <Card>
              <CardHeader>
                <CardTitle>{selectedTribe.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{selectedTribe.location}</p>
                {user ? (
                   <Button className="w-full mt-4" onClick={() => handleJoinTribe(selectedTribe.id)}>
                      Request to Join
                  </Button>
                ) : (
                  <p className="text-sm text-center mt-4 text-muted-foreground">Please log in to request to join a tribe.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
