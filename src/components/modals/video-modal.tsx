
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type VideoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  videoSrc: string;
};

export default function VideoModal({ isOpen, onClose, title, videoSrc }: VideoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Watch this short video to learn more about the Trading Tribe Path.
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video">
          <video
            className="w-full h-full rounded-lg"
            src={videoSrc}
            controls
            autoPlay
            muted
            playsInline
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
