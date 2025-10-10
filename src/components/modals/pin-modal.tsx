
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type PinModalProps = {
  isOpen: boolean;
  onClose: () => void;
  correctPin: string;
  onSuccess: () => void;
};

export default function PinModal({ isOpen, onClose, correctPin, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleVerify = () => {
    setIsLoading(true);
    if (pin === correctPin) {
      onSuccess();
    } else {
      toast({
        variant: "destructive",
        title: "Incorrect PIN",
        description: "Please try again.",
      });
      setPin("");
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Enter Developer PIN</DialogTitle>
          <DialogDescription>
            This area is restricted to developers.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleVerify()}
            placeholder="****"
            maxLength={4}
            className="text-center text-2xl tracking-[1rem]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleVerify} disabled={isLoading || pin.length !== 4}>
            {isLoading ? "Verifying..." : "Unlock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
