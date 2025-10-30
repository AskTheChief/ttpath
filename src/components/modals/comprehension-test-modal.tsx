
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { evaluateTutorialAnswers } from "@/ai/flows/evaluate-tutorial-answers";
import { saveTutorialAnswers } from "@/ai/flows/save-tutorial-answers";
import { getTutorialAnswers } from "@/ai/flows/get-tutorial-answers";
import { tutorialQuestions } from "@/lib/data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Loader2 } from "lucide-react";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";

type ComprehensionTestModalProps = {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onComplete: (reqId: string) => void;
};

export default function ComprehensionTestModal({ isOpen, user, onClose, onComplete }: ComprehensionTestModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; createdAt: string } | null>(null);

  // Fetch initial answers when modal opens
  useEffect(() => {
    async function fetchAnswers() {
      if (isOpen && user) {
        setIsFetching(true);
        try {
          const idToken = await user.getIdToken();
          const existingData = await getTutorialAnswers({ idToken });
          setAnswers(existingData.answers);
          if (existingData.latestFeedback) {
            setFeedback({
              message: existingData.latestFeedback.feedback,
              createdAt: existingData.latestFeedback.createdAt,
            });
          } else {
            setFeedback(null);
          }
        } catch (error) {
          console.error("Failed to fetch previous answers", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load your previous answers."
          });
        } finally {
          setIsFetching(false);
        }
      } else if (isOpen && !user) {
        setAnswers({});
        setFeedback(null);
      }
    }
    fetchAnswers();
  }, [isOpen, user, toast]);
  
  // Auto-save answers with debounce
  useEffect(() => {
    if (isFetching || !isOpen || !user) {
      return;
    }

    const handler = setTimeout(async () => {
      if (Object.keys(answers).length > 0) {
        setIsSaving(true);
        try {
          const idToken = await user.getIdToken();
          await saveTutorialAnswers({ answers, idToken });
        } catch (error) {
          console.error("Auto-save failed:", error);
        } finally {
          setIsSaving(false);
        }
      }
    }, 1500); // Save 1.5 seconds after user stops typing

    return () => {
      clearTimeout(handler);
    };
  }, [answers, user, isFetching, isOpen]);


  const handleAnswerChange = (question: string, value: string) => {
    setAnswers(prev => ({ ...prev, [question]: value }));
  };
  
  const handleReceiveFeedback = async () => {
    if (!user) {
        toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive'});
        return;
    }
    
    setIsLoading(true);
    
    try {
      const idToken = await user.getIdToken();
      toast({
        title: "The Chief Reviews Your Answers",
        description: "Please wait for feedback.",
      });

      const evaluation = await evaluateTutorialAnswers({ answers, idToken });
      
      const newFeedback = { message: evaluation.feedback, createdAt: new Date().toISOString() };
      setFeedback(newFeedback);
      
      onComplete('open-comprehension-test');
      
      toast({
        title: "You Receive Guidance",
        description: "The Chief provides new feedback for you to consider.",
      });

    } catch (error: any) {
      console.error("Error evaluating answers:", error);
      toast({
        title: "An Error Occurred",
        description: error.message || "There was a problem submitting your answers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleProceed = () => {
    onComplete("complete-comprehension-test");
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="text-2xl font-bold">Trading Tribe Source Guide Tutorial</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 text-muted-foreground">
                <p>1. Fill in the answers below to the best of your ability.</p>
                <p>2. Click on [Receive Feedback from the Chief].</p>
                <p>3. Revise your answers.</p>
                <p>4. Repeat until you feel ready to proceed; click the [I Feel Ready to Proceed] button.</p>
                <p>5. To take a break, press the [Return Later] button</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                  {isFetching ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-4">Loading your answers...</span>
                    </div>
                  ) : (
                    <>
                      {tutorialQuestions.map((q, i) => (
                          <div key={i} className="space-y-2">
                              <Label htmlFor={`q${i}`} className="text-md font-medium">{`${i + 1}. ${q}`}</Label>
                              <Textarea 
                                id={`q${i}`} 
                                rows={3}
                                value={answers[q] || ''}
                                onChange={(e) => handleAnswerChange(q, e.target.value)}
                                disabled={isLoading}
                                placeholder="Answer..."
                              />
                          </div>
                      ))}
                    </>
                  )}
              </div>
          </ScrollArea>
        </div>
        {feedback && (
          <div className="p-6 border-t">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle className="flex justify-between">
                <span>Guidance from The Chief</span>
                <span className="text-sm font-normal text-muted-foreground">{new Date(feedback.createdAt).toLocaleString()}</span>
              </AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">
                {feedback.message}
              </AlertDescription>
            </Alert>
          </div>
        )}
        <DialogFooter className="p-4 border-t bg-muted/50 justify-between items-center">
          <div>
            {isSaving && <span className="text-sm text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</span>}
          </div>
          <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Return Later
              </Button>
              <Button variant="secondary" onClick={handleReceiveFeedback} disabled={isLoading || isFetching}>
                {isLoading ? "Evaluating..." : "Receive Feedback from The Chief"}
              </Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleProceed} disabled={isLoading || isFetching}>
                I Feel Ready to Proceed
              </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
