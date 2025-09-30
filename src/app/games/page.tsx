
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Puzzle } from 'lucide-react';
import Link from 'next/link';

const games = [
  {
    href: '/games/svop-scramble',
    title: 'SVOP Scramble',
    description: 'Unscramble the words to form clear SVOP sentences.',
    icon: Puzzle,
  },
  {
    href: '/games/feelings-slicer',
    title: 'Feelings Slicer',
    description: 'Acknowledge feelings by slicing them, but avoid core principles!',
    icon: Gamepad2,
  },
]

export default function GamesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">Game Center</h1>
        <p className="text-muted-foreground">Choose a game to play and practice Tribe principles.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        {games.map((game) => (
          <Link href={game.href} key={game.title} passHref>
            <Card className="hover:shadow-lg hover:border-primary transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col">
              <CardHeader className="flex flex-row items-center gap-4">
                <game.icon className="h-10 w-10 text-primary" />
                <div>
                  <CardTitle>{game.title}</CardTitle>
                  <CardDescription>{game.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex items-end justify-end">
                 <Button variant="secondary" className="w-full">Play Now</Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
       <Button asChild variant="link" className="mt-12">
        <Link href="/">
          Back to Path
        </Link>
      </Button>
    </div>
  );
}
