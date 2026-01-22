
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
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type DevDropdownProps = {
  onTestCreateTribe: () => void;
  onSendTestEmail: () => void;
  onSendTestDiploma: () => void;
  onSendBugFinderDiploma: () => void;
  onResetProgress: () => void;
  currentUser: User | null;
};

const ADMIN_LEVEL = 6;

export default function DevDropdown({ onTestCreateTribe, onSendTestEmail, onSendTestDiploma, onSendBugFinderDiploma, onResetProgress, currentUser }: DevDropdownProps) {
  const router = useRouter();
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
        if (currentUser) {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists() && (userDoc.data().currentUserLevel || 0) >= ADMIN_LEVEL) {
                setIsAuthorizedAdmin(true);
            } else {
                setIsAuthorizedAdmin(false);
            }
        } else {
            setIsAuthorizedAdmin(false);
        }
    };
    checkAdminStatus();
  }, [currentUser]);

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
          {isAuthorizedAdmin && (
            <DropdownMenuItem onClick={() => router.push('/admin')}>
              Admin Dashboard
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => window.open('https://docs.google.com/document/d/1QzGpGfP7wSR-2TeNhOZ4W9D-Xm2FDeXCzTMyJ7aLgqs', '_blank')}>Library</DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/games')}>Game Center</DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/store')}>Store</DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/trading')}>Trading</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSendTestEmail}>Send Test Email</DropdownMenuItem>
          <DropdownMenuItem onClick={onSendTestDiploma}>Send Test Diploma</DropdownMenuItem>
          <DropdownMenuItem onClick={onSendBugFinderDiploma}>Send Bug Finder Diploma</DropdownMenuItem>
          <DropdownMenuItem onClick={onResetProgress}>Reset My Progress</DropdownMenuItem>
          <DropdownMenuItem onClick={onTestCreateTribe}>Start a Tribe (Test)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
