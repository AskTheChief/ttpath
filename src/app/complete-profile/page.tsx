
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useLoadScript, GoogleMap, MarkerF, Libraries } from '@react-google-maps/api';
import LocationAutocomplete from '@/components/location-autocomplete';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateUserProgress } from '@/ai/flows/update-user-progress';

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

type UserProfile = {
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  email: string;
};

// Map non-standard IDs to profile keys
const idToKeyMap: Record<string, keyof Omit<UserProfile, 'email'>> = {
  'profile_field_fname': 'firstName',
  'profile_field_lname': 'lastName',
  'profile_field_phone': 'phone',
};

export default function CompleteProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          // User profile already exists, they shouldn't be here.
          router.push('/');
        } else {
          setUser(currentUser);
          setProfile({ 
            email: currentUser.email || '',
           });
          setIsLoading(false);
        }
      } else {
        // Not logged in, redirect to home.
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

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
      // Normalize phone number: remove all non-digit characters except for a leading '+'
      const normalizedPhone = profile.phone.replace(/[^\d+]/g, (char, index) => {
        if (char === '+' && index === 0) {
          return '+';
        }
        return /\d/.test(char) ? char : '';
      }).replace(/(?!^)\+/g, '');


      const userProfileData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        address: profile.address,
        phone: normalizedPhone,
        email: user.email!,
        createdAt: new Date(user.metadata.creationTime || Date.now()).getTime(),
        lastLoginAt: serverTimestamp(),
        myAccountVisits: 0,
      };

      await setDoc(doc(db, 'users', user.uid), userProfileData);
      
      const idToken = await user.getIdToken();
      await updateUserProgress({
        currentUserLevel: 2, // Move to Guest
        requirementsState: { 'sign-up': true },
        idToken,
      });

      toast({
        title: 'Registration Successful!',
        description: 'Welcome to the Tribe! You are now a Guest.',
      });
      
      // Redirect to the main path page with a parameter to trigger animation
      router.push('/?action=registered');

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className="mt-4 text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-secondary">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
          <CardDescription>Let's get your profile details set up.</CardDescription>
        </CardHeader>
        <form onSubmit={handleProfileSubmit} noValidate autoComplete="off">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile_field_fname">First Name</Label>
                <Input id="profile_field_fname" placeholder="John" required value={profile.firstName || ''} onChange={handleProfileChange} autoComplete="off" role="presentation" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile_field_lname">Last Name</Label>
                <Input id="profile_field_lname" placeholder="Doe" required value={profile.lastName || ''} onChange={handleProfileChange} autoComplete="off" role="presentation" />
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
              <Input id="profile_field_phone" type="tel" placeholder="+15555555555" required value={profile.phone || ''} onChange={handleProfileChange} autoComplete="off" role="presentation" />
              <p className="text-sm text-muted-foreground">Please include your country code (e.g., +1 for USA).</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Profile...</> : 'Complete Registration'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
