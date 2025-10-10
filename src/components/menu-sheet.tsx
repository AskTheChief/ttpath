
"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import DevDropdown from './dev-dropdown';
import { Database, Swords, Gamepad2, Store, CandlestickChart, Map, Shield } from "lucide-react";

type MenuSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  openModal: (modalName: string) => void;
  isGuest: boolean;
  onTestCreateTribe: () => void;
};

const menuItems = [
    { id: 'pamphlet', icon: Database, label: 'Library' },
    { id: 'my-tribe', icon: Swords, label: 'My Tribe', href: '/my-tribe' },
    { id: 'tribes-map', icon: Map, label: 'Tribes Map', href: '/tribes-map' },
    { id: 'games', icon: Gamepad2, label: 'Games', href: '/games' },
    { id: 'store', icon: Store, label: 'Store', href: '/store' },
    { id: 'trading', icon: CandlestickChart, label: 'Trading', href: '/trading' },
];

export default function MenuSheet({ isOpen, onClose, openModal, isGuest, onTestCreateTribe }: MenuSheetProps) {

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
            className="w-full justify-start text-lg p-6"
            onClick={() => !isLink && handleItemClick(item)}
        >
            <item.icon className="h-12 w-12 mr-4" />
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
        <div className="p-4 space-y-2">
          {menuItems.map(renderMenuItem)}
          {isGuest && (
            <div className="relative flex w-full items-center justify-start text-lg p-6 hover:bg-accent hover:text-accent-foreground rounded-md">
              <Shield className="h-12 w-12 mr-4" />
              <span className="font-medium">Dev Den</span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <DevDropdown onTestCreateTribe={onTestCreateTribe} />
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
