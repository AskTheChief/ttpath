
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
import { Button } from './ui/button';
import { User } from "firebase/auth";

type DevDropdownProps = {
  onTestCreateTribe: () => void;
  onSendTestEmail: () => void;
  onSendTestDiploma: () => void;
  currentUser: User | null;
};

// Hardcoded list of developer email addresses for special access.
const devEmails = ['tt_95@yahoo.com', 'zizseykota@gmail.com'];

export default function DevDropdown({ onTestCreateTribe, onSendTestEmail, onSendTestDiploma, currentUser }: DevDropdownProps) {
  const isDeveloper = currentUser && devEmails.includes(currentUser.email || '');

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
           <Button
              variant="ghost"
              className="w-full justify-start text-xl p-4 h-auto"
          >
              <Shield className="mr-4 w-10 h-10" />
              Dev Den
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Dev Den</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isDeveloper && (
            <Link href="/admin" passHref>
              <DropdownMenuItem>Admin Dashboard</DropdownMenuItem>
            </Link>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => window.open('https://docs.google.com/document/d/1QzGpGfP7wSR-2TeNhOZ4W9D-Xm2FDeXCzTMyJ7aLgqs', '_blank')}>Library</DropdownMenuItem>
          <Link href="/games" passHref><DropdownMenuItem>Game Center</DropdownMenuItem></Link>
          <Link href="/store" passHref><DropdownMenuItem>Store</DropdownMenuItem></Link>
          <Link href="/trading" passHref><DropdownMenuItem>Trading</DropdownMenuItem></Link>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSendTestEmail}>Send Test Email</DropdownMenuItem>
          <DropdownMenuItem onClick={onSendTestDiploma}>Send Test Diploma</DropdownMenuItem>
          <DropdownMenuItem onClick={onTestCreateTribe}>Start a Tribe (Test)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
