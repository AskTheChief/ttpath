
"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import DevDropdown from './dev-dropdown';
import { Database, Swords, BookOpen, GraduationCap, Link2, BarChart2, MessageCircleQuestion, MessageSquare, BookCopy, Heart } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { User } from 'firebase/auth';

/**
 * @typedef {object} MenuSheetProps - Props for the MenuSheet component.
 * @property {boolean} isOpen - Controls whether the sheet is open or closed.
 * @property {() => void} onClose - Function to call when the sheet should be closed.
 * @property {(modalName: string) => void} openModal - Function to open a specific modal.
 * @property {boolean} isGuest - Flag indicating if the current user is logged in.
 * @property {() => void} onTestCreateTribe - Dev-only function to test tribe creation.
 * @property {() => void} onSendTestEmail - Dev-only function to send a test email.
 * @property {() => void} onSendTestDiploma - Dev-only function to send a test diploma.
 * @property {() => void} onSendBugFinderDiploma - Dev-only function to send a test bug finder diploma.
 * @property {() => void} onResetProgress - Dev-only function to reset user progress.
 * @property {User | null} currentUser - The current authenticated Firebase user, or null if not logged in.
 */
type MenuSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  openModal: (modalName: string) => void;
  isGuest: boolean;
  onTestCreateTribe: () => void;
  onSendTestEmail: () => void;
  onSendTestDiploma: () => void;
  onSendBugFinderDiploma: () => void;
  onResetProgress: () => void;
  currentUser: User | null;
};

// Hardcoded list of developer email addresses for special access.
const devEmails = ['tt_95@yahoo.com', 'zizseykota@gmail.com'];

// Defines the primary menu items that are always visible to logged-in users.
const menuItems = [
    { id: 'my-tribe', icon: Swords, label: 'My Account', href: '/my-tribe' },
];

// Defines additional links that are visible to guests.
const newLinks = [
    { id: 'faq', icon: MessageCircleQuestion, label: 'FAQ Pages', action: 'link', url: 'https://www.seykota.com/tt/FAQ_Index/' },
    { id: 'charts', icon: BarChart2, label: 'Stock and Futures Charts', action: 'link', url: 'https://eseykota.com/TT/PHP_TT/TT_charts/TT_charts_client.php' },
    { id: 'reach-out', icon: Link2, label: 'TT Reach-Out Pages', action: 'link', url: 'https://eseykota.com/TT/PHP_TT/TT_find/TT_find_client.php' }
]

/**
 * Renders a slide-out sheet menu providing access to various resources and actions.
 * The content of the menu changes based on the user's authentication status and role (guest, member, developer).
 *
 * @param {MenuSheetProps} props - The props for the component.
 */
export default function MenuSheet({ isOpen, onClose, openModal, isGuest, onTestCreateTribe, onSendTestEmail, onSendTestDiploma, onSendBugFinderDiploma, onResetProgress, currentUser }: MenuSheetProps) {

  // Check if the currently logged-in user is a developer.
  const isDeveloper = currentUser && devEmails.includes(currentUser.email || '');

  /**
   * Handles clicks on primary menu items.
   * If the item has an 'href', it will be handled by the Link component.
   * Otherwise, it calls 'openModal' to open a corresponding modal.
   * @param {object} item - The menu item that was clicked.
   */
  const handleItemClick = (item: (typeof menuItems)[0]) => {
    // If it's a link, close the sheet. Navigation is handled by the Link component.
    if (item.href) {
        onClose();
    } else {
        // If it's a modal trigger, call the openModal function.
        openModal(item.id);
    }
  }

  /**
   * Handles clicks on the external resource links.
   * Opens the corresponding URL in a new browser tab.
   * @param {string} url - The URL to open.
   */
  const handleLinkClick = (url: string) => {
    onClose();
    window.open(url, '_blank');
  };

  /**
   * Handles clicks within the "Library" dropdown.
   * Opens documentation in a new tab or opens the alignment test modal.
   * @param {'pamphlet' | 'methods' | 'philosophy' | 'alignment-test'} doc - The document identifier.
   */
  const handleLibraryClick = (doc: 'pamphlet' | 'methods' | 'philosophy' | 'alignment-test') => {
    onClose();
    const urls = {
        pamphlet: 'https://docs.google.com/document/d/12YS_MYx6i_uaY62a8I3-SUgZwz11qqdQ4cmZxQ4X4ic/',
        methods: 'https://docs.google.com/document/d/1KE8lVqnmYVQolnLbz6huUxftQSEz6YMGvU8x-TYnDgc/edit?tab=t.0',
        philosophy: 'https://docs.google.com/document/d/1JT7Rn5MUZjs-5PD_jweJrSIDD_fQRER3RPPx0xL2YHw/edit?tab=t.0',
    };

    if (doc === 'alignment-test') {
        openModal('open-alignment-test');
    } else {
        window.open(urls[doc], '_blank');
    }
  };

  /**
   * Renders a single menu item, either as a link or a button.
   * This function controls which items are visible based on the user's guest status.
   * @param {object} item - The menu item data to render.
   */
  const renderMenuItem = (item: (typeof menuItems)[0]) => {
    const isLink = !!item.href;
    
    // Only show items to logged-in users (not guests).
    if (isGuest) {
      // The actual button UI for the menu item.
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

      // If the item is a link, wrap it in Next.js's Link component for client-side navigation.
      if (isLink) {
        return (
          <Link href={item.href!} key={item.id} passHref>
            {content}
          </Link>
        );
      }

      // Otherwise, just render the button.
      return <div key={item.id}>{content}</div>;
    }
    return null;
  };
    
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="text-2xl">Resources</SheetTitle>
          <SheetDescription>A list of available resources and actions.</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          {/* Render menu items for logged-in users */}
          {menuItems.map(renderMenuItem)}

          {/* Additional resources available for all users (guests and logged-in) */}
          <>
            <Button
              variant="ghost"
              className="w-full justify-start text-xl p-4 h-auto"
              onClick={() => openModal('chatbot')}
            >
              <MessageSquare className="mr-4 w-10 h-10" />
              Ask the Chief
            </Button>
            <Link href="/faq" passHref>
              <Button
                variant="ghost"
                className="w-full justify-start text-xl p-4 h-auto"
                onClick={onClose}
              >
                  <BookCopy className="mr-4 w-10 h-10" />
                  FAQ
              </Button>
            </Link>
            <Link href="/relationships" passHref>
              <Button
                variant="ghost"
                className="w-full justify-start text-xl p-4 h-auto"
                onClick={onClose}
              >
                  <Heart className="mr-4 w-10 h-10" />
                  Relationships
              </Button>
            </Link>
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
                 <DropdownMenuItem onClick={() => handleLibraryClick('pamphlet')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Quick-Start Guide</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLibraryClick('methods')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Trading Tribe Methods</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLibraryClick('philosophy')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Trading Tribe Philosophy</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLibraryClick('alignment-test')}>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  <span>Alignment Test</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {newLinks.map(link => (
                <Button
                    key={link.id}
                    variant="ghost"
                    className="w-full justify-start text-xl p-4 h-auto"
                    onClick={() => handleLinkClick(link.url!)}
                >
                    <link.icon className="mr-4 w-10 h-10" />
                    {link.label}
                </Button>
            ))}
          </>

          {/* The Dev Den is only shown if the user is a developer */}
          {isDeveloper && (
            <DevDropdown 
              onTestCreateTribe={onTestCreateTribe} 
              onSendTestEmail={onSendTestEmail}
              onSendTestDiploma={onSendTestDiploma}
              onSendBugFinderDiploma={onSendBugFinderDiploma}
              onResetProgress={onResetProgress}
              currentUser={currentUser}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
