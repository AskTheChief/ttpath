
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createTribe } from '@/ai/flows/create-tribe';

type CreateTribeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateTribeModal({ isOpen, onClose }: CreateTribeModalProps) {
  const [tribeName, setTribeName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createTribe({ name: tribeName });
      toast({
        title: 'Tribe Created!',
        description: 'Your tribe has been created.',
      });
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating tribe',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a Tribe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <Label htmlFor="tribe-name">Tribe Name</Label>
            <Input
              id="tribe-name"
              value={tribeName}
              onChange={(e) => setTribeName(e.target.value)}
              placeholder="Enter your tribe's name"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
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
