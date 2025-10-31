
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Play, RefreshCw, XOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as Tone from 'tone';
import { useDrag } from '@use-gesture/react';

// Game constants
const ITEM_SIZE = 120;
const BOMB_CHANCE = 0.2; // 20% chance for an item to be a bomb
const GRAVITY_SCALE = 0.000125; // Scaled gravity
const MAX_PEAK_HEIGHT_SCALE = 0.16; // The closest items get to the top of the screen, as a fraction of height
const TRAIL_LENGTH = 15;

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
  const [trail, setTrail] = useState<{x: number, y: number}[]>([]);
  const [gameDimensions, setGameDimensions] = useState({ width: 800, height: 600 });
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number>();
  const lastSpawnTimeRef = useRef<number>(0);
  const nextItemId = useRef(0);
  const soundCooldown = useRef(false);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setGameDimensions({ width, height });
      }
    });

    if (gameAreaRef.current) {
      observer.observe(gameAreaRef.current);
    }

    return () => observer.disconnect();
  }, []);


  const playSound = (type: 'slice' | 'bomb' | 'miss') => {
    if (soundCooldown.current) return;

    if (Tone.context.state !== 'running') {
        Tone.start();
    }
    
    const synth = synths[type];
    if (!synth) return;

    if (synth instanceof Tone.MembraneSynth) {
        synth.triggerAttackRelease("C1", "1n");
    } else {
        synth.triggerAttack();
    }
    
    soundCooldown.current = true;
    setTimeout(() => {
        soundCooldown.current = false;
    }, 50); // 50ms cooldown
  };

  const createItem = useCallback(() => {
    const { width, height } = gameDimensions;

    const isBomb = Math.random() < BOMB_CHANCE;
    const type = isBomb ? 'principle' : 'feeling';
    const text = isBomb
      ? principles[Math.floor(Math.random() * principles.length)]
      : feelings[Math.floor(Math.random() * feelings.length)];

    const x = width / 2;
    const y = height;

    // Scaled physics
    const gravity = height * GRAVITY_SCALE;
    const maxPeakHeight = height * MAX_PEAK_HEIGHT_SCALE;
    const targetPeakY = maxPeakHeight + Math.random() * (height / 3);
    const deltaY = y - targetPeakY;
    const verticalVelocity = -Math.sqrt(2 * gravity * deltaY);

    return {
      id: nextItemId.current++,
      text,
      type,
      x,
      y,
      vx: (Math.random() - 0.5) * (width / 200), // Scale horizontal velocity
      vy: verticalVelocity,
      rotation: Math.random() * 360,
    };
  }, [gameDimensions]);

  const startGame = () => {
    // Ensure Tone.js is started by user interaction
    Tone.start();
    setScore(0);
    setLives(3);
    setItems([]);
    setTrail([]);
    setGameState('playing');
    lastSpawnTimeRef.current = Date.now();
  };
  
  const handleSlice = (id: number) => {
    setItems(currentItems => {
        const item = currentItems.find(i => i.id === id);
        if (!item || item.sliced) return currentItems;

        if (gameState === 'gameOver') return currentItems;

        if (item.type === 'principle') {
            playSound('bomb');
            setLives(l => {
                const newLives = l - 1;
                if (newLives <= 0) {
                    setGameState('gameOver');
                }
                return newLives;
            });
            return currentItems.map(i => i.id === id ? {...i, sliced: true} : i);
        }

        playSound('slice');
        setScore(s => s + 10);
        return currentItems.map(i => i.id === id ? {...i, sliced: true} : i);
    })
  }
  
  const bind = useDrag(({ xy: [x, y], down, event }) => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;
    
    const rect = gameAreaRef.current.getBoundingClientRect();

    const relativeX = x - rect.left;
    const relativeY = y - rect.top;

    if (down) {
        setTrail(currentTrail => [...currentTrail, { x: relativeX, y: relativeY }].slice(-TRAIL_LENGTH));
    } else {
        setTrail([]);
    }

    items.forEach(item => {
      const distance = Math.sqrt(
        Math.pow(relativeX - (item.x), 2) + Math.pow(relativeY - (item.y), 2)
      );
      if (distance < ITEM_SIZE / 2) {
        handleSlice(item.id);
      }
    });
  });

  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    const { height } = gameDimensions;
    const gravity = height * GRAVITY_SCALE;

    // Item Spawning
    const now = Date.now();
    if (now - lastSpawnTimeRef.current > 1500) { // Spawn every 1500ms
        lastSpawnTimeRef.current = now;
        setItems(prevItems => [...prevItems, createItem()]);
    }
    
    // Fade out trail
    if (trail.length > 0) {
        setTrail(currentTrail => currentTrail.slice(1));
    }

    // Item movement & cleanup
    setItems(prevItems => {
        let newLives = lives;
        const newItems = prevItems.map(item => {
            const newItem = {
                ...item,
                x: item.x + item.vx,
                y: item.y + item.vy,
                vy: item.vy + gravity, // Apply gravity
                rotation: item.rotation + item.vx,
            };
            
            if (item.y <= height + ITEM_SIZE && newItem.y > height + ITEM_SIZE && !newItem.sliced && newItem.type === 'feeling') {
                newLives--;
                if (newLives > 0) playSound('miss');
            }
            
            return newItem;
        });

        if (newLives !== lives) {
            setLives(newLives);
            if (newLives <= 0) {
                setGameState('gameOver');
            }
        }
        
        return newItems.filter(item => item.y < height + ITEM_SIZE * 2 || (item.sliced && item.y < height + ITEM_SIZE * 4));
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, createItem, lives, items, trail, gameDimensions]);

  useEffect(() => {
    if (gameState === 'playing' && gameDimensions.width > 0) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop, gameDimensions]);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="w-full max-w-4xl mx-auto flex flex-col">
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
          {...bind()}
          ref={gameAreaRef}
          className="relative w-full aspect-[4/3] bg-gray-800 border-4 border-primary rounded-lg overflow-hidden cursor-crosshair touch-none"
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
                    "absolute flex items-center justify-center font-bold text-2xl rounded-full select-none transition-opacity duration-300 pointer-events-none",
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
            >
                {item.text}
            </div>
          ))}

            <svg className="absolute inset-0 pointer-events-none z-10" width={gameDimensions.width} height={gameDimensions.height}>
                {trail.length > 1 && (
                    <polyline
                        points={trail.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="white"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ opacity: Math.max(0, trail.length / TRAIL_LENGTH) }}
                    />
                )}
            </svg>

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
