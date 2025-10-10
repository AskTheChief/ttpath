
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

type DevDropdownProps = {
  onTestCreateTribe: () => void;
  children: React.ReactNode;
};

const DEV_PIN = '3141';

export default function DevDropdown({ onTestCreateTribe, children }: DevDropdownProps) {
  const { toast } = useToast();
  const [showPinModal, setShowPinModal] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleReset = async () => {
    try {
      await resetUserProgress({});
      toast({
        title: "Progress Reset",
        description: "Your progress has been reset.",
      });
      window.location.reload();
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
          <button onClick={handleTriggerClick} className="w-full h-full absolute inset-0 focus:outline-none">
            {children}
          </button>
        </DropdownMenuTrigger>
        {isUnlocked && (
          <DropdownMenuContent>
            <DropdownMenuLabel>Dev Den</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/admin" passHref>
              <DropdownMenuItem>Admin Dashboard</DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
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
