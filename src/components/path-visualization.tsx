'use client';

import { Level, levels } from '@/lib/types';
import { User, Dna, Crown, GraduationCap, Users, Bot, Star, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ConfettiEffect from './confetti-effect';
import { absoluteCenter } from '@/lib/utils';
import { useSound } from '@/hooks/use-sound';

type Node = {
  id: Level;
  x: number;
  y: number;
  icon: React.ComponentType<{ className?: string }>;
};

const nodes: Node[] = [
  { id: 'Visitor', x: 50, y: 250, icon: User },
  { id: 'Guest', x: 250, y: 250, icon: Dna },
  { id: 'Candidate', x: 450, y: 250, icon: Bot },
  { id: 'Member', x: 700, y: 150, icon: Users },
  { id: 'Chief', x: 700, y: 250, icon: Crown },
  { id: 'Mentor', x: 700, y: 350, icon: GraduationCap },
];

const paths = {
  'Visitor-Guest': 'M 75 250 L 225 250',
  'Guest-Candidate': 'M 275 250 L 425 250',
  'Candidate-Member': 'M 475 250 C 550 250 625 150 675 150',
  'Candidate-Chief': 'M 475 250 L 675 250',
  'Candidate-Mentor': 'M 475 250 C 550 250 625 350 675 350',
};

const GamePiece = () => (
    <g className="drop-shadow-lg game-piece">
      <path d="M12 2L2 22h20L12 2z" fill="hsl(var(--primary))" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" />
    </g>
);


const PathVisualization = ({
  currentLevel,
  previousLevel,
  onNodeClick,
}: {
  currentLevel: Level;
  previousLevel: Level | null;
  onNodeClick: (level: Level) => void;
}) => {
  const meIconRef = useRef<SVGGElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { playWalk, stopWalk } = useSound();
  
  const [playerPosition, setPlayerPosition] = useState<{x: number; y: number}>(() => {
    const startNode = nodes.find(n => n.id === currentLevel);
    return { x: startNode?.x ?? 50, y: startNode?.y ?? 250 };
  });

  const currentNode = nodes.find(n => n.id === currentLevel);
  
  useEffect(() => {
    if (previousLevel && previousLevel !== currentLevel) {
      const pathKey = `${previousLevel}-${currentLevel}` as keyof typeof paths;
      const pathData = paths[pathKey];
      const endNode = nodes.find(n => n.id === currentLevel);
      
      if (pathData && endNode && meIconRef.current) {
        setIsAnimating(true);
        playWalk();
        const meIcon = meIconRef.current;
        
        // Temporarily set the animation path
        meIcon.style.offsetPath = `path('${pathData}')`;
        meIcon.style.animation = 'move-along 1.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards, walk 0.3s linear infinite';

        setTimeout(() => {
          setIsAnimating(false);
          setShowConfetti(true);
          setPlayerPosition({ x: endNode.x, y: endNode.y });
          stopWalk();
          if (meIconRef.current) {
             meIconRef.current.style.animation = '';
             meIconRef.current.style.offsetPath = 'none';
          }
        }, 1500);
      }
    } else if (currentNode) {
        setPlayerPosition({ x: currentNode.x, y: currentNode.y });
    }
  }, [currentLevel, previousLevel, currentNode, playWalk, stopWalk]);

  const currentLevelIndex = levels.indexOf(currentLevel);

  return (
    <div className="relative w-full max-w-4xl">
      <style>{`
        @keyframes move-along {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }
        @keyframes walk {
          0% { transform: translateY(-30px); }
          50% { transform: translateY(-35px); }
          100% { transform: translateY(-30px); }
        }
        .game-piece {
            transform: translateY(-30px);
        }
      `}</style>
      <svg viewBox="0 0 800 500" className="w-full h-auto overflow-visible" aria-hidden="true">
        <defs>
          {Object.entries(paths).map(([key, d]) => (
            <path id={`path-${key}`} key={key} d={d} />
          ))}
        </defs>

        {/* Draw all paths */}
        <g stroke="hsl(var(--muted))" strokeWidth="2" fill="none" strokeDasharray="4, 8" strokeLinecap="round">
            {Object.entries(paths).map(([key, d]) => {
                const [startLevel] = key.split('-') as [Level];
                const startLevelIndex = levels.indexOf(startLevel);
                const isCompletedPath = startLevelIndex < currentLevelIndex;
                return (
                    <path d={d} key={key} className={isCompletedPath ? 'stroke-primary stroke-dash-[0]' : ''} />
                )
            })}
        </g>

        {/* Nodes */}
        {nodes.map((node, index) => {
          const isCurrent = node.id === currentLevel;
          const isCompleted = index < currentLevelIndex;
          const isNext = index > currentLevelIndex;
          
          return (
            <g 
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => onNodeClick(node.id)}
              className={isCurrent ? 'cursor-pointer' : ''}
            >
              <circle
                r="25"
                fill={isCompleted || isCurrent ? 'hsl(var(--primary))' : 'hsl(var(--background))'}
                stroke={isCompleted || isCurrent ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                strokeWidth="2"
                className={`transition-all duration-300 ${isNext ? 'opacity-70' : ''}`}
              />
              {isCompleted ? (
                 <Check className={`w-8 h-8 text-primary-foreground ${absoluteCenter}`} />
              ) : (
                <node.icon
                  className={`w-8 h-8 absolute-center transition-colors duration-300 ${isCompleted || isCurrent ? 'text-primary-foreground' : 'text-muted-foreground'} ${isNext ? 'opacity-70' : ''}`}
                />
              )}
             
              <text
                y="40"
                textAnchor="middle"
                className={`font-headline text-sm fill-current transition-colors duration-300 ${isCompleted || isCurrent ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {node.id}
              </text>
              {isCurrent && (
                <circle
                  r="30"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  className="pulse-green"
                />
              )}
            </g>
          );
        })}
        
        {/* Me Icon - animated separately */}
        {currentNode && (
           <g ref={meIconRef} transform={!isAnimating ? `translate(${playerPosition.x}, ${playerPosition.y})` : ''}>
             <GamePiece />
           </g>
        )}
      </svg>
      {showConfetti && currentNode && (
        <div className="absolute" style={{ top: `${currentNode.y/5}%`, left: `${currentNode.x/8}%` }}>
             <ConfettiEffect onComplete={() => setShowConfetti(false)} />
        </div>
      )}
    </div>
  );
};

export default PathVisualization;
