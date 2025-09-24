
"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type LinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  requirementId: string | null;
  onComplete: (reqId: string) => void;
};

export default function LinkModal({
  isOpen,
  onClose,
  title,
  url,
  requirementId,
  onComplete,
}: LinkModalProps) {

  const handleComplete = () => {
    if (requirementId) {
      onComplete(requirementId);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Click the link below to open the document.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 break-all">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {title}
          </a>
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button onClick={onClose} variant="outline">Close</Button>
          {requirementId && (
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleComplete}
            >
              I've Read This
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
