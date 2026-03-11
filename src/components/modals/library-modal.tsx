
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { BookOpen, ExternalLink } from "lucide-react";

type LibraryModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const libraryLinks = [
  {
    title: "Quick-Start Guide",
    url: "https://docs.google.com/document/d/12YS_MYx6i_uaY62a8I3-SUgZwz11qqdQ4cmZxQ4X4ic/",
    description: "A brief overview of how the Tribe works."
  },
  {
    title: "Trading Tribe Methods",
    url: "https://docs.google.com/document/d/1KE8lVqnmYVQolnLbz6huUxftQSEz6YMGvU8x-TYnDgc/edit?tab=t.0",
    description: "Detailed description of Tribe processes and protocols."
  },
  {
    title: "Trading Tribe Philosophy",
    url: "https://docs.google.com/document/d/1JT7Rn5MUZjs-5PD_jweJrSIDD_fQRER3RPPx0xL2YHw/edit?tab=t.0",
    description: "The underlying principles and beliefs of the community."
  }
];

export default function LibraryModal({ isOpen, onClose }: LibraryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            The Library
          </DialogTitle>
          <DialogDescription>
            Explore our foundational documents and guides.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {libraryLinks.map((link, index) => (
            <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="block space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{link.title}</h4>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </a>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="w-full">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
