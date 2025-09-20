"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type SignupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (reqId: string) => void;
};

export default function SignupModal({ isOpen, onClose, onComplete }: SignupModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    onComplete("sign-up");
    toast({
      title: "Welcome, Guest!",
      description: `You can now proceed on your journey.`,
    });
    onClose();
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800">Become a Guest</DialogTitle>
          <DialogDescription>
            Confirm your intention to join as a guest.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <p className="text-slate-600">To become a Guest and unlock more abilities, confirm your intention to join.</p>
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50 rounded-b-lg">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? "Joining..." : "Join as Guest"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
