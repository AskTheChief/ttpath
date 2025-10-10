
'use client';

import { useState, useEffect } from 'react';
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

type DevDropdownProps = {
  onTestCreateTribe: () => void;
};

const DEV_PIN = '3141';

export default function DevDropdown({ onTestCreateTribe }: DevDropdownProps) {
  const { toast } = useToast();
  const [showPinModal, setShowPinModal] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    // Check if unlocked state is saved in session storage
    if (sessionStorage.getItem('dev-unlocked') === 'true') {
      setIsUnlocked(true);
    }
  }, []);

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
    sessionStorage.setItem('dev-unlocked', 'true');
    setShowPinModal(false);
    toast({ title: 'Dev Den Unlocked' });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="chat-icon" onClick={(e) => {
            if (!isUnlocked) {
              e.preventDefault();
              setShowPinModal(true);
            }
          }}>
            <Shield className="h-8 w-8 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        {isUnlocked && (
          <DropdownMenuContent>
            <DropdownMenuLabel>Dev Den</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/admin/feedback" passHref>
              <DropdownMenuItem>Feedback</DropdownMenuItem>
            </Link>
            <Link href="/admin/dev-den" passHref>
              <DropdownMenuItem>Chief Sessions</DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onTestCreateTribe}>Start a Tribe (Test)</DropdownMenuItem>
            <DropdownMenuItem onClick={handleReset}>Reset Progress</DropdownMenuItem>
          </DropdownMenuContent>
        )}
      </DropdownMenu>

      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        correctPin={DEV_PIN}
        onSuccess={handlePinSuccess}
      />
    </>
  );
}
