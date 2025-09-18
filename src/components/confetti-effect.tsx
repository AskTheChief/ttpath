'use client';

import { useState, useEffect } from 'react';

type ConfettiParticle = {
  id: number;
  style: React.CSSProperties;
};

const ConfettiEffect = ({ onComplete }: { onComplete: () => void }) => {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    const colors = ['#4B0082', '#E6E6FA', '#D8BFD8', '#a78bfa', '#facc15'];
    const newParticles: ConfettiParticle[] = Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      style: {
        position: 'absolute',
        width: `${Math.random() * 10 + 5}px`,
        height: `${Math.random() * 10 + 5}px`,
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        top: '50%',
        left: '50%',
        opacity: 1,
        transform: `translate(-50%, -50%)`,
        animation: `confetti-fall ${Math.random() * 1 + 0.5}s ease-out forwards`,
        '--translateX': `${(Math.random() - 0.5) * 600}px`,
        '--translateY': `${(Math.random() - 0.5) * 600}px`,
        '--rotate': `${(Math.random() - 0.5) * 720}deg`,
      },
    }));
    setParticles(newParticles);
    
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <style>{`
        @keyframes confetti-fall {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
            opacity: 1;
          }
          to {
            transform: translate(var(--translateX), var(--translateY)) rotate(var(--rotate));
            opacity: 0;
          }
        }
      `}</style>
      {particles.map(p => (
        <div key={p.id} style={p.style} />
      ))}
    </div>
  );
};

export default ConfettiEffect;
