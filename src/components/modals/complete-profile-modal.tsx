
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateUserProgress } from '@/ai/flows/update-user-progress';
import { useLoadScript, GoogleMap, MarkerF, Libraries } from '@react-google-maps/api';
import LocationAutocomplete from '@/components/location-autocomplete';

const libraries: Libraries = ['places'];
const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '0.5rem',
  marginTop: '0.5rem',
};
const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795,
};

type CompleteProfileModalProps = {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onComplete: (firstName: string) => void;
};

type UserProfile = {
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  email: string;
};

// Map non-standard IDs to profile keys
const idToKeyMap: Record<string, keyof UserProfile> = {
  'profile_field_fname': 'firstName',
  'profile_field_lname': 'lastName',
  'profile_field_phone': 'phone',
};

export default function CompleteProfileModal({ isOpen, user, onClose, onComplete }: CompleteProfileModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const profileKey = idToKeyMap[id];
    if (profileKey) {
      setProfile((prev) => ({ ...prev, [profileKey]: value }));
    }
  };
  
  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    if (place.formatted_address) {
      setProfile((prev) => ({ ...prev, address: place.formatted_address }));
    }
    if (place.geometry?.location) {
      setCoords({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('No user authenticated. Please restart the registration process.');
      return;
    }
    if (!profile.firstName || !profile.lastName || !profile.address || !profile.phone) {
      setError('All fields are required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const normalizedPhone = profile.phone.replace(/[^\d+]/g, (char, index) => {
        if (char === '+' && index === 0) return '+';
        return /\d/.test(char) ? char : '';
      }).replace(/(?!^)\+/g, '');

      const userProfileData: UserProfile = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        address: profile.address,
        phone: normalizedPhone,
        email: user.email!,
      };

      await setDoc(doc(db, 'users', user.uid), userProfileData);
      
      const idToken = await user.getIdToken();
      await updateUserProgress({
        currentUserLevel: 2,
        requirementsState: { 'sign-up': true },
        idToken,
      });

      toast({
        title: 'Profile Complete!',
        description: 'You are now a Guest. Your journey continues!',
      });
      
      onComplete(profile.firstName);

    } catch (error: any) {
      setError(error.message);
      toast({
        variant: 'destructive',
        title: 'Profile Creation Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Let's get your profile details set up to continue your journey.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleProfileSubmit} noValidate>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="profile_field_fname">First Name</Label>
                    <Input id="profile_field_fname" placeholder="John" required onChange={handleProfileChange} autoComplete="off" role="presentation" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="profile_field_lname">Last Name</Label>
                    <Input id="profile_field_lname" placeholder="Doe" required onChange={handleProfileChange} autoComplete="off" role="presentation" />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                {isLoaded && !loadError && (
                    <div style={mapContainerStyle}>
                        <GoogleMap
                            mapContainerStyle={{ height: '100%', width: '100%' }}
                            center={coords || defaultCenter}
                            zoom={coords ? 15 : 4}
                            options={{ disableDefaultUI: true }}
                        >
                            {coords && <MarkerF position={coords} />}
                        </GoogleMap>
                    </div>
                )}
                {loadError && <p className="text-sm text-destructive mt-2">Could not load map. Please check API key.</p>}
                <LocationAutocomplete
                    id="address"
                    placeholder="123 Main St, Anytown, USA"
                    onPlaceSelected={handlePlaceSelected}
                    initialValue={profile.address || ''}
                    required
                    disabled={!isLoaded}
                    autoComplete="off"
                    role="presentation"
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile_field_phone">Phone Number</Label>
              <Input id="profile_field_phone" type="tel" placeholder="+15555555555" required onChange={handleProfileChange} autoComplete="off" role="presentation" />
              <p className="text-sm text-muted-foreground">Please include your country code (e.g., +1 for USA).</p>
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Complete Registration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
