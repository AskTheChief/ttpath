'use client';

import { useEffect, useState, useTransition } from 'react';
import { completeRequirement, setLevel } from '@/app/actions';
import { generateRelevantAbilities } from '@/ai/flows/generate-relevant-abilities';
import type { GenerateRelevantAbilitiesOutput } from '@/ai/flows/generate-relevant-abilities';
import type { Level, Requirement, User } from '@/lib/types';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter } from './ui/card';
import { Check, Loader2 } from 'lucide-react';
import { useSound } from '@/hooks/use-sound';

type Ability = GenerateRelevantAbilitiesOutput['abilities'][number];

const AbilitiesPanel = ({
  user,
  onLevelAdvance,
}: {
  user: User;
  onLevelAdvance: (newLevel: Level) => void;
}) => {
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [nextLevel, setNextLevel] = useState<string | undefined>();
  const [nextPaths, setNextPaths] = useState<string[] | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [completedAnimation, setCompletedAnimation] = useState<string | null>(null);

  const { playDing } = useSound();

  useEffect(() => {
    const fetchAbilities = async () => {
      setIsLoading(true);
      try {
        const result = await generateRelevantAbilities({
          level: user.level,
          completedRequirements: user.completedRequirements,
        });
        setAbilities(result.abilities);
        setIsLevelComplete(result.isLevelComplete);
        setNextLevel(result.nextLevel);
        setNextPaths(result.nextPaths);
      } catch (error) {
        console.error('Failed to generate abilities:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAbilities();
  }, [user.level, user.completedRequirements]);

  const handleComplete = (requirementId: Requirement) => {
    startTransition(async () => {
      await completeRequirement(requirementId);
      playDing();
      setCompletedAnimation(requirementId);
      setTimeout(() => setCompletedAnimation(null), 700);
    });
  };
  
  const handleAdvance = (level: Level) => {
     startTransition(async () => {
        await setLevel(level);
        onLevelAdvance(level);
     });
  }

  return (
    <Card className="w-full max-w-md shadow-none border-none bg-transparent">
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {abilities.map((ability) => (
              <div key={ability.id} className="flex items-center space-x-4">
                <Button
                  size="icon"
                  variant={ability.isCompleted ? 'default' : 'outline'}
                  disabled={ability.isCompleted || isPending}
                  onClick={() => handleComplete(ability.id as Requirement)}
                  className={`relative rounded-full w-12 h-12 transition-all duration-300 ${completedAnimation === ability.id ? 'radiate-green' : ''}`}
                >
                  {isPending && !ability.isCompleted ? <Loader2 className="h-6 w-6 animate-spin"/> : 
                  (ability.isCompleted ? (
                    <Check className="h-6 w-6 pop-in" />
                  ) : (
                     <span className="text-2xl font-headline">?</span>
                  ))}
                </Button>
                <div>
                  <h3 className="font-bold font-headline">{ability.title}</h3>
                  <p className="text-sm text-muted-foreground">{ability.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {isLevelComplete && !isLoading && (
            <div className='flex flex-col gap-2 w-full'>
                <p className="text-center text-green-600 font-bold">Level complete! Choose your path.</p>
                {nextLevel && (
                     <Button onClick={() => handleAdvance(nextLevel as Level)} disabled={isPending} className="w-full">
                        {isPending ? <Loader2 className="animate-spin mr-2"/> : null}
                        Advance to {nextLevel}
                    </Button>
                )}
                {nextPaths && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                         {nextPaths.map(path => (
                             <Button key={path} onClick={() => handleAdvance(path as Level)} disabled={isPending} variant="secondary">
                                Become a {path}
                            </Button>
                         ))}
                    </div>
                )}
            </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default AbilitiesPanel;
