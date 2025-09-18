'use client';

import { useEffect, useRef } from 'react';
import * as Tone from 'tone';

export const useSound = () => {
  const isInitialized = useRef(false);
  const dingSynth = useRef<Tone.Synth | null>(null);

  useEffect(() => {
    const initialize = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;
      
      await Tone.start();
      dingSynth.current = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
      }).toDestination();
    };

    // Tone.js can only be started by a user gesture.
    // We'll attach it to the first click anywhere on the page.
    document.body.addEventListener('click', initialize, { once: true });
    
    return () => {
      document.body.removeEventListener('click', initialize);
    };
  }, []);

  const playDing = () => {
    if (dingSynth.current && Tone.context.state === 'running') {
      dingSynth.current.triggerAttackRelease('G5', '8n', Tone.now());
    }
  };

  return { playDing };
};
