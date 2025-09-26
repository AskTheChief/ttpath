
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getTribes } from '@/ai/flows/get-tribes';
import { joinTribe } from '@/ai/flows/join-tribe';

type JoinTribeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

interface Tribe {
  id: string;
  name: string;
}

export default function JoinTribeModal({ isOpen, onClose }: JoinTribeModalProps) {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribe, setSelectedTribe] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      async function fetchTribes() {
        const fetchedTribes = await getTribes({});
        setTribes(fetchedTribes);
      }
      fetchTribes();
    }
  }, [isOpen]);

  const handleJoin = async () => {
    if (!selectedTribe) return;
    setIsLoading(true);
    try {
      await joinTribe({ tribeId: selectedTribe });
      toast({
        title: 'Application Sent!',
        description: 'The tribe chief has been notified of your request.',
      });
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error joining tribe',
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
          <DialogTitle>Join a Tribe</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <ul>
            {tribes.map(tribe => (
              <li key={tribe.id}>
                <Button
                  variant={selectedTribe === tribe.id ? 'default' : 'outline'}
                  onClick={() => setSelectedTribe(tribe.id)}
                >
                  {tribe.name}
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={!selectedTribe || isLoading}>
            {isLoading ? 'Applying...' : 'Apply to Join'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
