
"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import DevDropdown from './dev-dropdown';
import { Database, MessageSquare, Swords, Gamepad2, Store, CandlestickChart, Mail } from "lucide-react";

type MenuSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  openModal: (modalName: string) => void;
  isGuest: boolean;
};

const menuItems = [
    { id: 'library', icon: Database, label: 'Library', requireGuest: false },
    { id: 'chatbot', icon: MessageSquare, label: 'The Chief', requireGuest: true },
    { id: 'my-tribe', icon: Swords, label: 'My Tribe', requireGuest: true, href: '/my-tribe' },
    { id: 'games', icon: Gamepad2, label: 'Games', requireGuest: true, href: '/games' },
    { id: 'store', icon: Store, label: 'Store', requireGuest: true, href: '/store' },
    { id: 'trading', icon: CandlestickChart, label: 'Trading', requireGuest: true, href: '/trading' },
    { id: 'feedback', icon: Mail, label: 'Send Feedback', requireGuest: false },
];

export default function MenuSheet({ isOpen, onClose, openModal, isGuest }: MenuSheetProps) {

  const handleItemClick = (item: (typeof menuItems)[0]) => {
    if (item.href) {
        onClose();
    } else {
        openModal(item.id);
    }
  }

  const renderMenuItem = (item: (typeof menuItems)[0]) => {
    if (item.requireGuest && !isGuest) return null;

    const content = (
        <Button
            variant="ghost"
            className="w-full justify-start text-lg p-6"
            onClick={() => handleItemClick(item)}
        >
            <item.icon className="h-6 w-6 mr-4" />
            {item.label}
        </Button>
    );

    if (item.href) {
        return <Link href={item.href} key={item.id}>{content}</Link>;
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
          <div className="p-2">
            <DevDropdown />
            <span className="ml-3 text-lg">Dev Den</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
