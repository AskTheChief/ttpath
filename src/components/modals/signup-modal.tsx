
"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SignupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  showLogin: () => void;
};

export default function SignupModal({ isOpen, onClose, showLogin }: SignupModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setIsLoading(false);
  };
  
  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        toast({ title: "Login Successful!", description: "Welcome back to the Tribe!" });
        handleClose();
        router.push('/'); // User already exists, just log them in and send to home.
      } else {
        toast({ title: "Account Created!", description: "Please complete your profile to continue." });
        handleClose();
        router.push('/complete-profile'); // New user, redirect to profile completion page.
      }

    } catch (error: any) {
      setError(error.message);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Create Account
          </DialogTitle>
          <DialogDescription>
            Create your account credentials to join.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleEmailSignup}>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-signup">Email Address</Label>
              <Input type="email" id="email-signup" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-signup">Password</Label>
              <Input type="password" id="password-signup" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="p-4 border-t flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Registering..." : "Create Account & Continue"}
            </Button>
            <Button type="button" variant="link" onClick={() => { onClose(); showLogin(); }} disabled={isLoading} className="w-full">
              Already have an account? Log In
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading} className="w-full">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
