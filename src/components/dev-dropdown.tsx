
'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Shield } from 'lucide-react';
import Link from 'next/link';
import { resetUserProgress } from "@/ai/flows/reset-user-progress";
import { useToast } from "@/hooks/use-toast";
import PinModal from './modals/pin-modal';
import { Button } from './ui/button';
import { auth } from '@/lib/firebase';

type DevDropdownProps = {
  onTestCreateTribe: () => void;
  onSendTestEmail: () => void;
  onSendTestDiploma: () => void;
};

const DEV_PIN = '3141';

export default function DevDropdown({ onTestCreateTribe, onSendTestEmail, onSendTestDiploma }: DevDropdownProps) {
  const { toast } = useToast();
  const [showPinModal, setShowPinModal] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleReset = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Authenticated",
        description: "You must be logged in to reset progress.",
      });
      return;
    }

    try {
      const idToken = await user.getIdToken();
      await resetUserProgress({ idToken });
      toast({
        title: "Progress Reset",
        description: "Your progress has been reset. Refreshing...",
      });
      // Use a timeout to allow the toast to be seen before reload
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error resetting progress",
        description: error.message,
      });
    }
  };
  
  const handlePinSuccess = () => {
    setIsUnlocked(true);
    setShowPinModal(false);
    setDropdownOpen(true); // Open dropdown after successful PIN
    toast({ title: 'Dev Den Unlocked' });
  };

  const handleCloseModal = () => {
    setShowPinModal(false);
  }

  const handleDropdownOpenChange = (open: boolean) => {
    setDropdownOpen(open);
    // When the dropdown closes, re-lock it.
    if (!open) {
      setIsUnlocked(false);
    }
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (!isUnlocked) {
      e.preventDefault();
      setShowPinModal(true);
    }
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={handleDropdownOpenChange}>
        <DropdownMenuTrigger asChild>
           <Button
              variant="ghost"
              className="w-full justify-start text-xl p-4 h-auto"
              onClick={handleTriggerClick}
          >
              <Shield className="mr-4 w-10 h-10" />
              Dev Den
          </Button>
        </DropdownMenuTrigger>
        {isUnlocked && (
          <DropdownMenuContent>
            <DropdownMenuLabel>Dev Den</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/admin" passHref>
              <DropdownMenuItem>Admin Dashboard</DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.open('https://docs.google.com/document/d/1QzGpGfP7wSR-2TeNhOZ4W9D-Xm2FDeXCzTMyJ7aLgqs', '_blank')}>Library</DropdownMenuItem>
            <Link href="/games" passHref><DropdownMenuItem>Game Center</DropdownMenuItem></Link>
            <Link href="/store" passHref><DropdownMenuItem>Store</DropdownMenuItem></Link>
            <Link href="/trading" passHref><DropdownMenuItem>Trading</DropdownMenuItem></Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSendTestEmail}>Send Test Email</DropdownMenuItem>
            <DropdownMenuItem onClick={onSendTestDiploma}>Send Test Diploma</DropdownMenuItem>
            <DropdownMenuItem onClick={onTestCreateTribe}>Start a Tribe (Test)</DropdownMenuItem>
            <DropdownMenuItem onClick={handleReset}>Reset Progress</DropdownMenuItem>
          </DropdownMenuContent>
        )}
      </DropdownMenu>

      <PinModal
        isOpen={showPinModal}
        onClose={handleCloseModal}
        correctPin={DEV_PIN}
        onSuccess={handlePinSuccess}
      />
    </>
  );
}
