
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Play, RefreshCw, XOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as Tone from 'tone';

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const ITEM_SIZE = 120;
const BOMB_CHANCE = 0.2; // 20% chance for an item to be a bomb
const GRAVITY = 0.075; // Reduced gravity
const MAX_PEAK_HEIGHT = 100; // The closest items get to the top of the screen

const feelings = ["Anger", "Fear", "Sadness", "Envy", "Judgement", "Resentment", "Guilt"];
const principles = ["Support", "Willingness", "Honesty", "Feedback", "Accountability", "Acknowledgment"];

type GameItem = {
  id: number;
  text: string;
  type: 'feeling' | 'principle';
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  sliced?: boolean;
};

// Sound setup
let synths: { slice?: Tone.NoiseSynth, bomb?: Tone.MembraneSynth, miss?: Tone.NoiseSynth } = {};
if (typeof window !== 'undefined') {
    synths.slice = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0 },
    }).toDestination();

    synths.bomb = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 10,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
    }).toDestination();
    
    synths.miss = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0 },
    }).toDestination();
}


export default function FeelingsSlicerPage() {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameOver'>('ready');
  const [items, setItems] = useState<GameItem[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const gameLoopRef = useRef<number>();
  const lastSpawnTimeRef = useRef<number>(0);
  const nextItemId = useRef(0);
  const lastSoundTime = useRef(0);

  const playSound = (synth: Tone.NoiseSynth | Tone.MembraneSynth | undefined, ...args: any[]) => {
      if (!synth) return;
      if (Tone.context.state !== 'running') {
        Tone.start();
      }
      let now = Tone.now();
      if (now <= lastSoundTime.current) {
        now = lastSoundTime.current + 0.05; // Add a small delay
      }
      lastSoundTime.current = now;

      if (synth instanceof Tone.MembraneSynth) {
          synth.triggerAttackRelease(args[0], args[1], now);
      } else {
          synth.triggerAttack(now);
      }
  };

  const createItem = useCallback(() => {
    const isBomb = Math.random() < BOMB_CHANCE;
    const type = isBomb ? 'principle' : 'feeling';
    const text = isBomb
      ? principles[Math.floor(Math.random() * principles.length)]
      : feelings[Math.floor(Math.random() * feelings.length)];

    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT;

    // Calculate vertical velocity to ensure it reaches a certain height but not off-screen
    const targetPeakY = MAX_PEAK_HEIGHT + Math.random() * (GAME_HEIGHT / 3);
    const deltaY = y - targetPeakY;
    const verticalVelocity = -Math.sqrt(2 * GRAVITY * deltaY);

    return {
      id: nextItemId.current++,
      text,
      type,
      x,
      y,
      vx: (Math.random() - 0.5) * 4, // Gentle horizontal movement
      vy: verticalVelocity, // Calculated vertical speed
      rotation: Math.random() * 360,
    };
  }, []);

  const startGame = () => {
    // Ensure Tone.js is started by user interaction
    Tone.start();
    setScore(0);
    setLives(3);
    setItems([]);
    setGameState('playing');
    lastSpawnTimeRef.current = Date.now();
  };
  
  const handleSlice = (id: number) => {
    setItems(currentItems => {
        // Prevent any slicing logic if the game is already over
        if (gameState === 'gameOver') return currentItems;
        
        const item = currentItems.find(i => i.id === id);
        if (!item || item.sliced) return currentItems;

        if (item.type === 'principle') {
            playSound(synths.bomb, "C1", "1n");
            setGameState('gameOver');
            return currentItems.map(i => ({...i, sliced: true}));
        }

        playSound(synths.slice);
        setScore(s => s + 10);
        return currentItems.map(i => i.id === id ? {...i, sliced: true} : i);
    })
  }

  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    // Item Spawning
    const now = Date.now();
    if (now - lastSpawnTimeRef.current > 1500) { // Spawn every 1500ms
        lastSpawnTimeRef.current = now;
        setItems(prevItems => [...prevItems, createItem()]);
    }

    // Item movement & cleanup
    setItems(prevItems => {
        const newItems = prevItems.map(item => {
            const newItem = {
                ...item,
                x: item.x + item.vx,
                y: item.y + item.vy,
                vy: item.vy + GRAVITY, // Apply gravity
                rotation: item.rotation + item.vx,
            };
            return newItem;
        });

        // Check for missed items
        const missedFeelings = newItems.filter(item => item.y > GAME_HEIGHT + ITEM_SIZE && !item.sliced && item.type === 'feeling');
        if (missedFeelings.length > 0) {
            playSound(synths.miss);
            setLives(l => {
                const newLives = l - missedFeelings.length;
                if (newLives <= 0) {
                    setGameState('gameOver');
                    return 0;
                }
                return newLives;
            });
        }
        
        return newItems.filter(item => item.y < GAME_HEIGHT + ITEM_SIZE * 2 || item.sliced && item.y < GAME_HEIGHT + ITEM_SIZE * 4);
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, createItem]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop]);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Feelings Slicer</h1>
            <div className="flex items-center gap-6 text-xl">
                <div>Score: <span className="font-bold">{score}</span></div>
                <div className="flex items-center gap-2">
                    Lives: 
                    {Array.from({length: 3}).map((_, i) => (
                        <XOctagon key={i} className={cn("h-6 w-6", i < lives ? "text-red-500 fill-current" : "text-gray-600")} />
                    ))}
                </div>
            </div>
        </div>

        <div 
          className="relative bg-gray-800 border-4 border-primary rounded-lg overflow-hidden cursor-crosshair" 
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        >
          {gameState === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-20">
                <h2 className="text-5xl font-bold mb-4">Feelings Slicer</h2>
                <p className="mb-8">Slice the feelings, avoid the principles!</p>
                <Button size="lg" onClick={startGame}><Play className="mr-2" /> Start Game</Button>
            </div>
          )}
          {gameState === 'gameOver' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
                <h2 className="text-6xl font-bold text-red-500 mb-4">Game Over</h2>
                <p className="text-2xl mb-2">Final Score: {score}</p>
                <Button size="lg" onClick={startGame}><RefreshCw className="mr-2" /> Play Again</Button>
            </div>
          )}

          {items.map(item => (
            <div
                key={item.id}
                className={cn(
                    "absolute flex items-center justify-center font-bold text-2xl rounded-full select-none transition-opacity duration-300",
                    item.type === 'feeling' ? 'bg-blue-500' : 'bg-yellow-500 text-gray-900',
                    item.sliced && "opacity-0"
                )}
                style={{
                    left: item.x,
                    top: item.y,
                    width: ITEM_SIZE,
                    height: ITEM_SIZE,
                    transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                }}
                onMouseEnter={() => handleSlice(item.id)}
            >
                {item.text}
            </div>
          ))}
        </div>
      </div>
      <Button asChild variant="link" className="mt-6 text-white">
        <Link href="/games">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Game Center
        </Link>
      </Button>
    </div>
  );
}
