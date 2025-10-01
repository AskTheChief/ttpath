
'use client';

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
import { updateUserProgress } from "@/ai/flows/update-user-progress";
import { useToast } from "@/hooks/use-toast";

export default function DevDropdown() {
  const { toast } = useToast();

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

  const handleJumpToGraduate = async () => {
    try {
      await updateUserProgress({
        currentUserLevel: 3,
        requirementsState: {
          'read-book': true,
          'sign-up': true,
          'read-full-book': true,
          'complete-tutorial': true,
        },
      });
      toast({
        title: "Jumped to Graduate",
        description: "You are now at the Graduate level.",
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error jumping to graduate",
        description: error.message,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="chat-icon">
          <Shield className="h-8 w-8 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
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
        <DropdownMenuItem onClick={handleJumpToGraduate}>Jump to Graduate</DropdownMenuItem>
        <DropdownMenuItem onClick={handleReset}>Reset Progress</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
