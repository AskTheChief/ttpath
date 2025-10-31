
"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import DevDropdown from './dev-dropdown';
import { Database, Swords, Gamepad2, Store, CandlestickChart, Shield } from "lucide-react";

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
    { id: 'pamphlet', icon: Database, label: 'Library' },
    { id: 'my-tribe', icon: Swords, label: 'My Account', href: '/my-tribe' },
    { id: 'games', icon: Gamepad2, label: 'Game Center', href: '/games' },
    { id: 'store', icon: Store, label: 'Store', href: '/store' },
    { id: 'trading', icon: CandlestickChart, label: 'Trading', href: '/trading' },
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
