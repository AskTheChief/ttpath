"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

type GuestNameModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onNameSubmit: (name: string) => void;
};

export default function GuestNameModal({ isOpen, onClose, onNameSubmit }: GuestNameModalProps) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    onNameSubmit(name.trim());
    onClose();
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Welcome, Guest</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name">Please enter your first name to continue</Label>
              <Input
                id="guest-name"
                placeholder="Your first name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="p-4 border-t flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Saving..." : "Continue"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="w-full">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
