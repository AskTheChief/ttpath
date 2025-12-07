
'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type LegacyUser } from '@/ai/flows/get-legacy-users';

type ViewRecordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userRecord: LegacyUser | null;
};

export default function ViewRecordModal({ isOpen, onClose, userRecord }: ViewRecordModalProps) {
  if (!userRecord) {
    return null;
  }

  const userName = userRecord.firstName || userRecord.first || 'Unknown User';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>User Record: {userName}</DialogTitle>
          <DialogDescription>
            Complete JSON data for the selected user.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow rounded-md border bg-muted/50">
          <pre className="text-xs p-4">
            <code>
              {JSON.stringify(userRecord, null, 2)}
            </code>
          </pre>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
