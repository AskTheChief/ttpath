
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getTribes } from '@/ai/flows/get-tribes';
import { joinTribe } from '@/ai/flows/join-tribe';
import { ScrollArea } from '../ui/scroll-area';
import { Tribe } from '@/lib/types';

type JoinTribeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

export default function JoinTribeModal({ isOpen, onClose, onComplete }: JoinTribeModalProps) {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribe, setSelectedTribe] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      async function fetchTribes() {
        setIsLoading(true);
        try {
            const fetchedTribes = await getTribes({});
            setTribes(fetchedTribes as Tribe[]);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error fetching tribes',
                description: 'Could not load available tribes.',
            });
        } finally {
            setIsLoading(false);
        }
      }
      fetchTribes();
    }
  }, [isOpen, toast]);

  const handleJoin = async () => {
    if (!selectedTribe) return;
    setIsLoading(true);
    try {
      // The applicantId is handled by the flow context, no need to pass it.
      const result = await joinTribe({ tribeId: selectedTribe });
      if (result.success) {
        toast({
            title: 'Application Sent!',
            description: 'The tribe chief has been notified of your request.',
        });
        onComplete();
        onClose();
      } else {
        throw new Error('Failed to send application');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error joining tribe',
        description: error.message || 'An unknown error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="z-40">
        <DialogHeader>
          <DialogTitle>Join a Tribe</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-64">
            <div className="p-4 space-y-2">
            {isLoading && <p>Loading tribes...</p>}
            {!isLoading && tribes.length === 0 && <p>No tribes available to join.</p>}
            {tribes.map(tribe => (
                <Button
                    key={tribe.id}
                    variant={selectedTribe === tribe.id ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setSelectedTribe(tribe.id)}
                >
                    {tribe.name}
                </Button>
            ))}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={!selectedTribe || isLoading}>
            {isLoading ? 'Submitting...' : 'Apply to Join'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
