
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

export default function DevDropdown() {
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
