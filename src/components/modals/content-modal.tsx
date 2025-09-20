"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type ContentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  iframeSrc: string;
  requirementId: string;
  onComplete: (reqId: string) => void;
};

export default function ContentModal({
  isOpen,
  onClose,
  title,
  iframeSrc,
  requirementId,
  onComplete,
}: ContentModalProps) {
  
  const handleComplete = () => {
    onComplete(requirementId);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        style={{
          width: '90vw',
          maxWidth: '1400px',
          height: '90vh',
          maxHeight: '90vh',
          padding: '0'
        }}
        className="flex flex-col"
      >
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-2xl font-bold text-foreground">{title}</DialogTitle>
          <DialogDescription>
            This is a modal containing content related to the current step.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex justify-center items-center bg-gray-100">
          <iframe
            className="w-full max-w-4xl h-full border-0"
            src={iframeSrc}
            allowFullScreen
            title={title}
          ></iframe>
        </div>
        <DialogFooter className="p-4 border-t bg-muted/50 rounded-b-lg">
          <Button onClick={onClose} variant="outline">Close</Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleComplete}
          >
            I've Read This
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
