
"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import LocationAutocomplete from "../location-autocomplete";
import { GoogleMap, useLoadScript, Libraries } from "@react-google-maps/api";
import { cn } from "@/lib/utils";

type SignupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (reqId: string) => void;
  showLogin: () => void;
};

type UserProfile = {
  firstName: string;
  lastName: string;
  address: string;
  lat?: number;
  lng?: number;
  phone: string;
  email: string;
}

const libraries: Libraries = ["places"];

const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '0.5rem',
  marginTop: '1rem'
};

export default function SignupModal({ isOpen, onClose, onComplete, showLogin }: SignupModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [profile, setProfile] = useState<Partial<UserProfile>>({
    firstName: '',
    lastName: '',
    address: '',
    phone: '',
  });
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const handleClose = () => {
    // Reset state on close
    setStep(1);
    setEmail('');
    setPassword('');
    setError(null);
    setIsLoading(false);
    setUser(null);
    setProfile({});
    setCoords(null);
    onClose();
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      setProfile(prev => ({ ...prev, email: userCredential.user.email || '' }));
      setStep(2); // Move to profile details step
    } catch (error: any) {
      setError(error.message);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        setError("No user authenticated. Please restart the registration process.");
        return;
    }
    if (!profile.firstName || !profile.lastName || !profile.address || !profile.phone) {
        setError("All fields are required.");
        return;
    }
    if (!coords) {
        setError("Please select a valid address from the dropdown.");
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const userProfileData: UserProfile = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        address: profile.address,
        lat: coords.lat,
        lng: coords.lng,
        phone: profile.phone,
        email: user.email!,
      };
      
      await setDoc(doc(db, "users", user.uid), userProfileData);

      toast({
        title: "Registration Successful!",
        description: "Welcome to the Tribe! You are now a Guest.",
      });
      onComplete("sign-up");
      handleClose(); // Close and reset modal
    } catch (error: any) {
      setError(error.message);
      toast({
        variant: "destructive",
        title: "Profile Creation Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setProfile(prev => ({ ...prev, [id]: value }));
  };

  const handlePlaceSelected = (place: google.maps.places.PlaceResult) => {
    setProfile(prev => ({...prev, address: place.formatted_address || ''}));
    setCoords(place.geometry?.location ? {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
    } : null);
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-md", step === 2 && "max-w-2xl")}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {step === 1 ? 'Become a Guest (Step 1/2)' : 'Complete Your Profile (Step 2/2)'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "First, create your account credentials."
              : "Now, let's get your profile details."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <form onSubmit={handleEmailSignup}>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-signup">Email Address</Label>
                <Input type="email" id="email-signup" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Password</Label>
                <Input type="password" id="password-signup" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="p-4 border-t flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Registering..." : "Continue"}
              </Button>
              <Button type="button" variant="link" onClick={showLogin} disabled={isLoading} className="w-full">
                Already have an account? Log In
              </Button>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading} className="w-full">
                Cancel
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
           <form onSubmit={handleProfileSubmit}>
           <div className="p-6 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" required value={profile.firstName} onChange={handleProfileChange} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" required value={profile.lastName} onChange={handleProfileChange} />
                </div>
             </div>
             <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="+1 (555) 555-5555" required value={profile.phone} onChange={handleProfileChange} />
             </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <LocationAutocomplete 
                    id="address"
                    onPlaceSelected={handlePlaceSelected}
                    placeholder="Search for your address..."
                    disabled={!isLoaded}
                    initialValue={profile.address}
                />
                {loadError && <p className="text-sm text-destructive">Could not load maps.</p>}
                {isLoaded && (
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={coords || { lat: 39.8283, lng: -98.5795 }}
                        zoom={coords ? 15 : 4}
                        options={{ disableDefaultUI: true, gestureHandling: 'none' }}
                    >
                        {coords && <google.maps.Marker position={coords} />}
                    </GoogleMap>
                )}
              </div>
             {error && <p className="text-sm text-destructive">{error}</p>}
           </div>
           <div className="p-4 border-t flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isLoading}>Back</Button>
             <Button type="submit" className="w-full" disabled={isLoading || !isLoaded}>
               {isLoading ? "Saving Profile..." : "Complete Registration"}
             </Button>
           </div>
         </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
    