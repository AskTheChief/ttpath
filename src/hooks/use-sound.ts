'use client';

import { useEffect, useRef } from 'react';
import * as Tone from 'tone';

export const useSound = () => {
  const isInitialized = useRef(false);
  const dingSynth = useRef<Tone.Synth | null>(null);
  const footstepSynth = useRef<Tone.MembraneSynth | null>(null);
  const footstepLoop = useRef<Tone.Loop | null>(null);

  useEffect(() => {
    const initialize = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;
      
      await Tone.start();

      dingSynth.current = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
      }).toDestination();
      
      footstepSynth.current = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 6,
        oscillator: { type: 'square4' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0.01, release: 0.1 },
      }).toDestination();
      footstepSynth.current.volume.value = -12;

      footstepLoop.current = new Tone.Loop(time => {
        footstepSynth.current?.triggerAttackRelease('C2', '8n', time);
      }, '8n');
    };

    // Tone.js can only be started by a user gesture.
    // We'll attach it to the first click anywhere on the page.
    document.body.addEventListener('click', initialize, { once: true });
    
    return () => {
      document.body.removeEventListener('click', initialize);
      footstepLoop.current?.dispose();
      footstepSynth.current?.dispose();
      dingSynth.current?.dispose();
    };
  }, []);

  const playDing = () => {
    if (dingSynth.current && Tone.context.state === 'running') {
      dingSynth.current.triggerAttackRelease('G5', '8n', Tone.now());
    }
  };
  
  const playWalk = () => {
    if (footstepLoop.current && Tone.context.state === 'running' && footstepLoop.current.state !== 'started') {
        Tone.Transport.start();
        footstepLoop.current.start(0);
    }
  }

  const stopWalk = () => {
    if (footstepLoop.current && footstepLoop.current.state === 'started') {
        footstepLoop.current.stop();
        Tone.Transport.stop();
    }
  }

  return { playDing, playWalk, stopWalk };
};
