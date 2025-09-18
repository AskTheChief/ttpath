'use client';

import { useEffect, useState, useTransition } from 'react';
import { fetchUserData } from '@/app/actions';
import type { Level, User } from '@/lib/types';
import PathVisualization from './path-visualization';
import AbilitiesPanel from './abilities-panel';
import { Skeleton } from './ui/skeleton';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"


const usePrevious = <T,>(value: T): T | null => {
  const ref = useState<T | null>(null);
  useEffect(() => {
    ref[1](value);
  });
  return ref[0];
};

const TribeQuestApp = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isAbilitiesPanelOpen, setIsAbilitiesPanelOpen] = useState(false);

  const previousLevel = usePrevious(user?.level ?? null);

  useEffect(() => {
    startTransition(async () => {
      setIsLoading(true);
      const userData = await fetchUserData();
      setUser(userData);
      setIsLoading(false);
    });
  }, []);

  const handleLevelAdvance = (newLevel: Level) => {
    if(user){
        setUser({ ...user, level: newLevel, completedRequirements: user.completedRequirements });
    }
    setIsAbilitiesPanelOpen(false);
  };
  
  const handleNodeClick = (level: Level) => {
    if (level === user?.level) {
      setIsAbilitiesPanelOpen(true);
    }
  }

  if (isLoading || !user) {
    return (
        <div className="flex flex-col items-center gap-12 w-full">
            <Skeleton className="h-[400px] w-full max-w-4xl" />
            <Skeleton className="h-[300px] w-full max-w-md" />
        </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-12 w-full">
      <h1 className="text-5xl font-headline text-primary tracking-wider">TribeQuest</h1>
      <PathVisualization 
        currentLevel={user.level} 
        previousLevel={previousLevel}
        onNodeClick={handleNodeClick}
      />
      <Dialog open={isAbilitiesPanelOpen} onOpenChange={setIsAbilitiesPanelOpen}>
        <DialogContent>
            {user && <AbilitiesPanel key={user.level} user={user} onLevelAdvance={handleLevelAdvance} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TribeQuestApp;
