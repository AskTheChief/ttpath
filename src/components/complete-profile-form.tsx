'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateUserProgress } from '@/ai/flows/update-user-progress';
import { useLoadScript, GoogleMap, MarkerF, Libraries } from '@react-google-maps/api';
import LocationAutocomplete from '@/components/location-autocomplete';
import { cn } from '@/lib/utils';
import { sendDiplomaEmail } from '@/ai/flows/send-diploma-email';

const libraries: Libraries = ['places'];
const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '0.5rem',
  marginBottom: '1rem',
};
const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795,
};

type CompleteProfileFormProps = {
  user: User | null;
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

export default function CompleteProfileForm({ user, onComplete }: CompleteProfileFormProps) {
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
    
    // Detailed validation checks
    if (!profile.firstName) {
        setError('Please enter your First Name.');
        return;
    }
    if (!profile.lastName) {
        setError('Please enter your Last Name.');
        return;
    }
    if (!profile.address) {
        setError('Please select your Address from the dropdown.');
        return;
    }
    if (!profile.phone) {
        setError('Please enter your Phone Number.');
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

      await setDoc(doc(db, 'users', user.uid), userProfileData, { merge: true });
      
      const idToken = await user.getIdToken();
      await updateUserProgress({
        currentUserLevel: 3,
        requirementsState: { 'sign-up': true, 'complete-comprehension-test': true },
        idToken,
      });

      // Send the diploma email
      await sendDiplomaEmail({
        recipientEmail: user.email!,
        recipientName: profile.firstName,
      });

      toast({
        title: 'Profile Complete & Diploma Sent!',
        description: "Congratulations, you are now a Graduate! Your diploma is in your inbox.",
      });
      
      onComplete(profile.firstName!);

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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 min-h-screen">
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Complete Your Graduation</CardTitle>
                <CardDescription>
                    To become a Graduate, please provide your information. This helps you connect with tribes in your area.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleProfileSubmit} noValidate>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="profile_field_fname">First Name</Label>
                    <Input id="profile_field_fname" placeholder="John" required onChange={handleProfileChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="profile_field_lname">Last Name</Label>
                    <Input id="profile_field_lname" placeholder="Doe" required onChange={handleProfileChange} />
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
                        id="location_autocomplete"
                        placeholder="123 Main St, Anytown, USA"
                        onPlaceSelected={handlePlaceSelected}
                        initialValue={profile.address || ''}
                        required
                        disabled={!isLoaded}
                    />
                </div>
                <div className="space-y-2">
                <Label htmlFor="profile_field_phone">Phone Number</Label>
                <Input id="profile_field_phone" type="tel" placeholder="+15555555555" required onChange={handleProfileChange} />
                <p className="text-sm text-muted-foreground">Please include your country code (e.g., +1 for USA).</p>
                </div>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </CardContent>
            <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Complete Graduation & Receive Diploma'}
                </Button>
            </CardFooter>
            </form>
        </Card>
    </div>
  );
}
