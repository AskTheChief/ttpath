
"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import DevDropdown from './dev-dropdown';
import { Database, Swords, BookOpen, GraduationCap } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

type MenuSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  openModal: (modalName: string) => void;
  isGuest: boolean;
  onTestCreateTribe: () => void;
  onSendTestEmail: () => void;
  onSendTestDiploma: () => void;
};

const menuItems = [
    { id: 'my-tribe', icon: Swords, label: 'My Account', href: '/my-tribe' },
];

export default function MenuSheet({ isOpen, onClose, openModal, isGuest, onTestCreateTribe, onSendTestEmail, onSendTestDiploma }: MenuSheetProps) {

  const handleItemClick = (item: (typeof menuItems)[0]) => {
    if (item.href) {
        onClose();
    } else {
        openModal(item.id);
    }
  }

  const renderMenuItem = (item: (typeof menuItems)[0]) => {
    const isLink = !!item.href;
    
    // The library ('pamphlet') is visible to everyone.
    // Other items are only visible to guests (logged-in users).
    if (item.id !== 'pamphlet' && !isGuest) {
      return null;
    }

    const content = (
        <Button
            variant="ghost"
            className="w-full justify-start text-xl p-4 h-auto"
            onClick={() => !isLink && handleItemClick(item)}
        >
            <item.icon className="mr-4 w-10 h-10" />
            {item.label}
        </Button>
    );

    if (isLink) {
      return (
        <Link href={item.href!} key={item.id} passHref>
          {content}
        </Link>
      );
    }

    return <div key={item.id}>{content}</div>;
  };
    
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="text-2xl">Menu</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          {menuItems.map(renderMenuItem)}

          {isGuest && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-xl p-4 h-auto"
                >
                    <Database className="mr-4 w-10 h-10" />
                    Library
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => openModal('open-full-book')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Trading Tribe Methods</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openModal('open-full-book-part-2')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Trading Tribe Theory</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openModal('open-comprehension-test')}>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  <span>Tutorial</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isGuest && (
            <DevDropdown 
              onTestCreateTribe={onTestCreateTribe} 
              onSendTestEmail={onSendTestEmail}
              onSendTestDiploma={onSendTestDiploma}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
