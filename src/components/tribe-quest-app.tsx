'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { fetchUserData, resetProgress } from '@/app/actions';
import type { Level, User } from '@/lib/types';
import PathVisualization from './path-visualization';
import AbilitiesPanel from './abilities-panel';
import { Skeleton } from './ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { RefreshCw } from 'lucide-react';


const usePrevious = <T,>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
};

const TribeQuestApp = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isAbilitiesPanelOpen, setIsAbilitiesPanelOpen] = useState(false);

  const previousLevel = usePrevious(user?.level ?? null) as Level | null;

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
        setUser({ ...user, level: newLevel, completedRequirements: {} });
    }
    setIsAbilitiesPanelOpen(false);
  };
  
  const handleNodeClick = (level: Level) => {
    if (level === user?.level) {
      setIsAbilitiesPanelOpen(true);
    }
  }

  const handleReset = () => {
    startTransition(async () => {
      const defaultUser = await resetProgress();
      setUser(defaultUser);
    });
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
      <div className="flex items-center justify-between w-full max-w-4xl">
        <div className="w-12"></div>
        <h1 className="text-5xl font-headline text-primary tracking-wider text-center">TribeQuest</h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="icon" className="w-12 h-12 rounded-full">
                <RefreshCw />
                <span className="sr-only">Reset Progress</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will reset all your progress back to the 'Visitor' level.
                You will lose all completed abilities.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <PathVisualization 
        currentLevel={user.level} 
        previousLevel={previousLevel}
        onNodeClick={handleNodeClick}
      />
      <Dialog open={isAbilitiesPanelOpen} onOpenChange={setIsAbilitiesPanelOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="font-headline text-3xl">Level: {user.level}</DialogTitle>
                <DialogDescription>Complete your abilities to advance.</DialogDescription>
            </DialogHeader>
            {user && <AbilitiesPanel key={user.level} user={user} onLevelAdvance={handleLevelAdvance} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TribeQuestApp;
