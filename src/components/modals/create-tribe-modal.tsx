
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

type CreateTribeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '0.5rem',
  marginTop: '1rem',
};

const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795,
};

export default function CreateTribeModal({ isOpen, onClose, onComplete }: CreateTribeModalProps) {
  const [tribeName, setTribeName] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tribeName.trim() || !location.trim() || !coords) {
        toast({
            variant: 'destructive',
            title: 'All fields are required',
            description: 'Please select a valid location from the dropdown.',
        });
        return;
    }
    setIsLoading(true);
    try {
      const result = await createTribe({ 
        name: tribeName, 
        location,
        lat: coords.lat,
        lng: coords.lng,
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
    setLocation('');
    setCoords(null);
    onClose();
  }

  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    if (place.formatted_address) {
      setLocation(place.formatted_address);
    }
    if (place.geometry?.location) {
      const newCoords = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
      setCoords(newCoords);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a Tribe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
             <div>
                <Label htmlFor="tribe-name">Tribe Name</Label>
                <Input
                  id="tribe-name"
                  value={tribeName}
                  onChange={(e) => setTribeName(e.target.value)}
                  placeholder="Enter your tribe's name"
                  required
                />
             </div>
             <div>
                <Label htmlFor="tribe-location">Location</Label>
                <LocationAutocomplete
                  id="tribe-location"
                  onPlaceSelected={handlePlaceSelected}
                  placeholder="e.g., New York, NY"
                  required
                  value={location}
                   onChange={(e) => {
                    setLocation(e.target.value);
                    if (e.target.value === '') {
                        setCoords(null);
                    }
                  }}
                />
             </div>
              <div className="mt-4">
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={coords || defaultCenter}
                  zoom={coords ? 12 : 4}
                >
                  {coords && <MarkerF position={coords} />}
                </GoogleMap>
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
