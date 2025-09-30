
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Confetti from 'react-dom-confetti';

const sentences = [
  "I feel anger.",
  "You see the truth.",
  "She experiences joy.",
  "He holds a belief.",
  "We want a solution.",
  "They create a plan.",
  "My heart feels heavy.",
  "Your words carry weight.",
  "The tribe shares feelings.",
  "Fear provides protection.",
  "Anger supports boundaries.",
  "I accept your decision.",
];

const forbiddenWords = ["is", "am", "are", "was", "were", "be", "being", "been"];

type Feedback = {
  type: 'correct' | 'incorrect' | 'forbidden';
  message: string;
} | null;

export default function GamesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [wordBank, setWordBank] = useState<string[]>([]);
  const [playerAnswer, setPlayerAnswer] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const shuffleAndSetWords = useCallback(() => {
    const correctSentence = sentences[currentSentenceIndex];
    const words = correctSentence.split(' ').sort(() => Math.random() - 0.5);
    setWordBank(words);
    setPlayerAnswer([]);
    setFeedback(null);
  }, [currentSentenceIndex]);

  useEffect(() => {
    shuffleAndSetWords();
  }, [currentSentenceIndex, shuffleAndSetWords]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const handleWordBankClick = (word: string, index: number) => {
    setPlayerAnswer(prev => [...prev, word]);
    setWordBank(prev => prev.filter((_, i) => i !== index));
    setFeedback(null);
  };

  const handleAnswerClick = (word: string, index: number) => {
    setWordBank(prev => [...prev, word]);
    setPlayerAnswer(prev => prev.filter((_, i) => i !== index));
    setFeedback(null);
  };

  const checkAnswer = () => {
    const answerString = playerAnswer.join(' ');
    
    const hasForbiddenWord = playerAnswer.some(word => forbiddenWords.includes(word.toLowerCase().replace(/[.]/, '')));
    if (hasForbiddenWord) {
      setFeedback({ type: 'forbidden', message: "Try again. Avoid 'to be' verbs." });
      return;
    }
    
    if (answerString === sentences[currentSentenceIndex]) {
      setFeedback({ type: 'correct', message: "Correct! Excellent." });
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        setCurrentSentenceIndex((currentSentenceIndex + 1) % sentences.length);
      }, 1500);
    } else {
      setFeedback({ type: 'incorrect', message: "Not quite. Try rearranging the words." });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-secondary">
      <Card className="w-full max-w-lg shadow-2xl relative">
        <CardHeader>
          <CardTitle className="text-2xl">SVOP Scramble</CardTitle>
          <CardDescription>Arrange the words to form a clear sentence without using "to be" verbs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="min-h-[6rem] p-4 border-2 border-dashed rounded-lg bg-background flex flex-wrap items-center justify-center gap-2">
            {playerAnswer.length > 0 ? (
              playerAnswer.map((word, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-lg p-2 cursor-pointer"
                  onClick={() => handleAnswerClick(word, index)}
                >
                  {word}
                </Badge>
              ))
            ) : (
               <span className="text-muted-foreground">Your sentence will appear here</span>
            )}
          </div>
          
          <div className="min-h-[6rem] p-4 border rounded-lg flex flex-wrap items-center justify-center gap-2">
            {wordBank.map((word, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-lg p-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                onClick={() => handleWordBankClick(word, index)}
              >
                {word}
              </Badge>
            ))}
          </div>

          {feedback && (
            <div className={cn("p-3 rounded-md text-sm font-medium flex items-center gap-2", {
                'bg-green-100 text-green-800': feedback.type === 'correct',
                'bg-red-100 text-red-800': feedback.type === 'incorrect',
                'bg-yellow-100 text-yellow-800': feedback.type === 'forbidden',
            })}>
               {feedback.type === 'correct' && <CheckCircle className="h-5 w-5"/>}
               {feedback.type === 'incorrect' && <XCircle className="h-5 w-5"/>}
               {feedback.type === 'forbidden' && <XCircle className="h-5 w-5"/>}
               {feedback.message}
            </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={shuffleAndSetWords}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={checkAnswer} disabled={wordBank.length > 0 || feedback?.type === 'correct'}>
            Check Answer
          </Button>
        </CardFooter>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Confetti active={showConfetti} />
        </div>
      </Card>
      
      <Button asChild variant="link" className="mt-6">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Path
        </Link>
      </Button>
    </div>
  );
}
