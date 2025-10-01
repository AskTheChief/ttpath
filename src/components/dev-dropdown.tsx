
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
import { useToast } from "@/hooks/use-toast";

type DevDropdownProps = {
  onTestCreateTribe: () => void;
};

export default function DevDropdown({ onTestCreateTribe }: DevDropdownProps) {
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
        <DropdownMenuItem onClick={onTestCreateTribe}>Start a Tribe (Test)</DropdownMenuItem>
        <DropdownMenuItem onClick={handleReset}>Reset Progress</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
