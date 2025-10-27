
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateUserProgress } from '@/ai/flows/update-user-progress';

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

export default function CompleteProfileModal({ isOpen, user, onClose, onComplete }: CompleteProfileModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [error, setError] = useState<string | null>(null);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Let's get your profile details set up to continue your journey.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleProfileSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">First Name</Label>
              <Input id="firstName" name="firstName" placeholder="John" required onChange={handleProfileChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastName" className="text-right">Last Name</Label>
              <Input id="lastName" name="lastName" placeholder="Doe" required onChange={handleProfileChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">Address</Label>
              <Input id="address" name="address" placeholder="123 Main St, Anytown, USA" required onChange={handleProfileChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+15555555555" required onChange={handleProfileChange} className="col-span-3" />
            </div>
             <p className="text-sm text-muted-foreground col-span-4 pl-[calc(25%+1rem)]">
                Please include your country code (e.g., +1 for USA).
            </p>
            {error && <p className="text-sm text-destructive col-span-4 text-center">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Complete Registration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
