
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { addUser } from '@/ai/flows/add-user';

type AddContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
  adminUser: User | null;
  onContactAdded: () => void;
};

export default function AddContactModal({ isOpen, onClose, adminUser, onContactAdded }: AddContactModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleClose = () => {
    setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
    });
    setError(null);
    onClose();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) {
      setError('You must be logged in as an admin.');
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('First Name, Last Name, and Email are required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const idToken = await adminUser.getIdToken(true);
      const result = await addUser({
        idToken,
        ...formData,
      });

      if (result.success) {
        toast({
          title: 'Contact Added',
          description: `${formData.firstName} ${formData.lastName} has been added.`,
        });
        onContactAdded();
        handleClose();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      setError(error.message);
      toast({
        variant: 'destructive',
        title: 'Failed to Add Contact',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Manually add a new user to the system. This will create a profile but not an authentication account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">
                First Name
              </Label>
              <Input id="firstName" value={formData.firstName} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastName" className="text-right">
                Last Name
              </Label>
              <Input id="lastName" value={formData.lastName} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input id="email" type="email" value={formData.email} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input id="address" value={formData.address} onChange={handleChange} className="col-span-3" />
            </div>
            {error && <p className="text-sm text-destructive text-center col-span-4">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Contact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
