
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Play } from 'lucide-react';

export default function VideoPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Introduction to The Trading Tribe Path</CardTitle>
          <CardDescription>Watch this short video to learn more.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video relative bg-black rounded-lg">
            <video
              ref={videoRef}
              className="w-full h-full rounded-lg"
              src="/Videos/couch.mp4"
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
        </CardContent>
      </Card>
      <Button asChild variant="link" className="mt-8">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Path
        </Link>
      </Button>
    </div>
  );
}
