'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createTribe } from '@/ai/flows/create-tribe';
import LocationAutocomplete from '../location-autocomplete';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

type CreateTribeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795,
};

export default function CreateTribeModal({ isOpen, onClose, onComplete }: CreateTribeModalProps) {
  const [tribeName, setTribeName] = useState('');
  const [newTribeLocation, setNewTribeLocation] = useState('');
  const [newTribeCoords, setNewTribeCoords] = useState<{lat: number; lng: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  useState(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tribeName.trim() || !newTribeLocation.trim() || !newTribeCoords) {
        toast({
            variant: 'destructive',
            title: 'All fields are required',
            description: 'Please select a valid location from the dropdown.',
        });
        return;
    }
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'You must be logged in to create a tribe.',
        });
        return;
    }
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const result = await createTribe({ 
        name: tribeName, 
        location: newTribeLocation,
        lat: newTribeCoords.lat,
        lng: newTribeCoords.lng,
        idToken,
      });
      if (result.success) {
        toast({
          title: 'Tribe Created!',
          description: 'Your tribe has been created and will appear on the map.',
        });
        onComplete();
        handleClose();
      } else {
        throw new Error('Failed to create tribe.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating tribe',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    setTribeName('');
    setNewTribeLocation('');
    setNewTribeCoords(null);
    onClose();
  }

  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    const location = place.formatted_address || '';
    const coords = place.geometry?.location ? {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    } : null;
    
    setNewTribeLocation(location);
    setNewTribeCoords(coords);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a Tribe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
             <div className="space-y-2">
                <Label htmlFor="tribe-name">Tribe Name</Label>
                <Input
                  id="tribe-name"
                  value={tribeName}
                  onChange={(e) => setTribeName(e.target.value)}
                  placeholder="Enter your tribe's name"
                  required
                />
             </div>
             <div className="space-y-2">
                <div className="mb-2">
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={newTribeCoords || defaultCenter}
                        zoom={newTribeCoords ? 12 : 4}
                    >
                    {newTribeCoords && <MarkerF position={newTribeCoords} />}
                    </GoogleMap>
                </div>
                <Label htmlFor="tribe-location">Location</Label>
                <LocationAutocomplete
                    id="tribe-location"
                    onPlaceSelected={handlePlaceSelected}
                    placeholder="e.g., New York, NY"
                    required
                    initialValue={newTribeLocation}
                />
             </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Tribe'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
