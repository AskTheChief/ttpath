"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  showSignup: () => void;
};

export default function LoginModal({ isOpen, onClose, showSignup }: LoginModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login Successful!",
        description: "Welcome back to the Tribe!",
      });
      onClose();
    } catch (error: any) {
      setError(error.message);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Login to your Account</DialogTitle>
          <DialogDescription>
            Enter your credentials to log in to your account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleEmailLogin}>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-login">Email Address</Label>
              <Input type="email" id="email-login" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-login">Password</Label>
              <Input type="password" id="password-login" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="p-4 border-t flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login with Email"}
            </Button>
            <Button type="button" variant="link" onClick={showSignup} disabled={isLoading} className="w-full">
              Don't have an account? Sign Up
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
