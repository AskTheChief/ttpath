'use client';

import { Level, levels } from '@/lib/types';
import { User, Dna, Crown, GraduationCap, Users, Bot, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ConfettiEffect from './confetti-effect';

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
  'Visitor-Guest': 'M 50 250 Q 150 200 250 250',
  'Guest-Candidate': 'M 250 250 Q 350 200 450 250',
  'Candidate-Member': 'M 450 250 Q 575 150 700 150',
  'Candidate-Chief': 'M 450 250 Q 575 200 700 250',
  'Candidate-Mentor': 'M 450 250 Q 575 350 700 350',
};

const PathVisualization = ({
  currentLevel,
  previousLevel,
}: {
  currentLevel: Level;
  previousLevel: Level | null;
}) => {
  const meIconRef = useRef<SVGGElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const currentNode = nodes.find(n => n.id === currentLevel);
  
  useEffect(() => {
    if (previousLevel && previousLevel !== currentLevel) {
      const pathKey = `${previousLevel}-${currentLevel}` as keyof typeof paths;
      const path = paths[pathKey];
      
      if (path && meIconRef.current) {
        setIsAnimating(true);
        const meIcon = meIconRef.current;
        
        // Temporarily set the animation path
        meIcon.style.offsetPath = `path('${path}')`;
        meIcon.style.animation = 'move-along 1.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards';

        setTimeout(() => {
          setIsAnimating(false);
          setShowConfetti(true);
          if (meIconRef.current) {
             meIconRef.current.style.animation = '';
             meIconRef.current.style.offsetPath = 'none';
          }
        }, 1500);
      }
    }
  }, [currentLevel, previousLevel]);

  const currentLevelIndex = levels.indexOf(currentLevel);

  return (
    <div className="relative w-full max-w-4xl">
      <style>{`
        @keyframes move-along {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }
      `}</style>
      <svg viewBox="0 0 800 500" className="w-full h-auto" aria-hidden="true">
        <defs>
          {Object.entries(paths).map(([key, d]) => (
            <path id={`path-${key}`} key={key} d={d} />
          ))}
        </defs>

        {/* Draw all paths */}
        <g stroke="hsl(var(--primary) / 0.2)" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="5, 10">
          {Object.values(paths).map((d, i) => (
            <path d={d} key={i} />
          ))}
        </g>

        {/* Nodes */}
        {nodes.map((node, index) => {
          const isCurrent = node.id === currentLevel;
          const isUnlocked = index > currentLevelIndex;
          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <circle
                r="20"
                fill="hsl(var(--background))"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                className={`transition-all duration-300 ${isUnlocked ? 'shimmer-blue opacity-50' : ''}`}
              />
              <node.icon
                className={`w-6 h-6 text-primary absolute-center transition-colors duration-300 ${isUnlocked ? 'opacity-50' : ''}`}
              />
              <text
                y="40"
                textAnchor="middle"
                className="font-headline text-sm fill-current text-primary"
              >
                {node.id}
              </text>
              {isCurrent && (
                <circle
                  r="20"
                  fill="none"
                  stroke="transparent"
                  className="pulse-green"
                />
              )}
            </g>
          );
        })}
        
        {/* Me Icon - animated separately */}
        {currentNode && (
           <g ref={meIconRef} transform={!isAnimating ? `translate(${currentNode.x}, ${currentNode.y})` : ''}>
             <circle r="12" fill="hsl(var(--primary))" />
             <Star className="w-4 h-4 text-primary-foreground absolute-center" fill="currentColor"/>
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
