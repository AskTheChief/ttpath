
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
  onComplete: () => void;
};

export default function CreateTribeModal({ isOpen, onClose, onComplete }: CreateTribeModalProps) {
  const [tribeName, setTribeName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tribeName.trim()) {
        toast({
            variant: 'destructive',
            title: 'Tribe name is required',
        });
        return;
    }
    setIsLoading(true);
    try {
      // The chiefId is now handled by the flow context, so we don't pass it here.
      const result = await createTribe({ name: tribeName });
      if (result.success) {
        toast({
          title: 'Tribe Created!',
          description: 'Your tribe has been created.',
        });
        onComplete();
        onClose();
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
