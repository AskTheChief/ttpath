
"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

type VideoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  videoSrc: string;
};

export default function VideoModal({ isOpen, onClose, title, videoSrc }: VideoModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsPlaying(false);
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Watch this short video to learn more about the Trading Tribe Path.
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video relative bg-black rounded-lg">
          <video
            ref={videoRef}
            className="w-full h-full rounded-lg"
            src={videoSrc}
            controls={isPlaying}
            playsInline
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
           {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-20 w-20 bg-white/20 hover:bg-white/30"
                onClick={handlePlay}
              >
                <Play className="h-12 w-12 text-white" fill="white" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
