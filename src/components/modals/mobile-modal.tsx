
"use client";

import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export default function MobileModal({ isOpen, onClose, title, url }: MobileModalProps) {

  const handleOpenLink = () => {
    window.open(url, '_blank');
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        handleOpenLink();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, url]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="z-40">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            You are being redirected to the document. If a new tab does not open automatically, please click the button below.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Button onClick={handleOpenLink} className="w-full">
            Open Document
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
