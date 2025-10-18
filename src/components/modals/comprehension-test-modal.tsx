
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { evaluateTutorialAnswers } from "@/ai/flows/evaluate-tutorial-answers";
import { saveTutorialAnswers } from "@/ai/flows/save-tutorial-answers";
import { getTutorialAnswers } from "@/ai/flows/get-tutorial-answers";
import { tutorialQuestions } from "@/lib/data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { User } from "firebase/auth";

type ComprehensionTestModalProps = {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onComplete: (reqId: string) => void;
};

export default function ComprehensionTestModal({ isOpen, user, onClose, onComplete }: ComprehensionTestModalProps) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [agreeMeetings, setAgreeMeetings] = useState(false);
  const [agreeMentor, setAgreeMentor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string } | null>(null);
  const [showReviewButton, setShowReviewButton] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Fetch initial answers when modal opens
  useEffect(() => {
    async function fetchAnswers() {
      if (isOpen && user) {
        setIsFetching(true);
        setFeedback(null);
        setShowReviewButton(false);
        try {
          const idToken = await user.getIdToken();
          const existingAnswers = await getTutorialAnswers({ idToken });
          setAnswers(existingAnswers);
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


  const allAgreed = agreeMeetings && agreeMentor;

  const handleAnswerChange = (question: string, value: string) => {
    setAnswers(prev => ({ ...prev, [question]: value }));
  };
  
  const handleSubmitForFeedback = async () => {
    if (!allAgreed) {
      toast({
        title: "Agreement Required",
        description: "You must agree to both statements to proceed.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
        toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive'});
        return;
    }
    
    setIsLoading(true);
    setFeedback(null);
    setShowReviewButton(false);

    try {
      // Answers are already saved via auto-save, just evaluate them.
      toast({
        title: "The Chief Reviews Your Answers",
        description: "Please wait for feedback.",
      });

      const evaluation = await evaluateTutorialAnswers({ answers });
      
      setFeedback({ message: evaluation.feedback });
      setShowReviewButton(true);
      
      toast({
        title: "You Receive Guidance",
        description: "The Chief provides some feedback for you to consider.",
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
    setAgreeMeetings(false);
    setAgreeMentor(false);
    setFeedback(null);
    setIsLoading(false);
    setShowReviewButton(false);
    setShowConfirmation(false);
    onClose();
  };

  const handleProceedToGraduate = () => {
    onComplete("complete-comprehension-test");
    handleClose();
  };

  const handleNeedsMoreTime = () => {
    toast({
      title: "Self-Reflection",
      description: "Please read over the source book again, reflect, and update your comprehension test until you feel ready.",
      duration: 5000,
    });
    setShowConfirmation(false);
    // We don't close the main modal, allowing the user to continue editing.
  };
  
  const handleReviewFeedback = () => {
    setShowConfirmation(true);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-2xl font-bold text-slate-800">Comprehension Test Study Guide</DialogTitle>
            <DialogDescription>
              You answer the questions below to complete the comprehension test. Your answers auto-save as you go. You submit to The Chief for guidance when you feel ready.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                    {isFetching ? (
                      <p>Loading your answers...</p>
                    ) : (
                      <>
                        {tutorialQuestions.map((q, i) => (
                            <div key={i} className="space-y-2">
                                <Label htmlFor={`q${i}`} className="text-md font-medium text-slate-700">{`${i + 1}. ${q}`}</Label>
                                <Textarea 
                                  id={`q${i}`} 
                                  rows={3}
                                  value={answers[q] || ''}
                                  onChange={(e) => handleAnswerChange(q, e.target.value)}
                                  disabled={isLoading || showReviewButton}
                                  placeholder="Your thoughtful answer..."
                                />
                            </div>
                        ))}
                        <div className="space-y-4 pt-4 border-t">
                              <div className="flex items-start space-x-3">
                                  <Checkbox id="agree-meetings" checked={agreeMeetings} onCheckedChange={(checked) => setAgreeMeetings(Boolean(checked))} disabled={isLoading || showReviewButton} />
                                  <Label htmlFor="agree-meetings" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                      I agree to participate fully in all meetings and to submit reports promptly. (Must Agree to Proceed)
                                  </Label>
                              </div>
                              <div className="flex items-start space-x-3">
                                  <Checkbox id="agree-mentor" checked={agreeMentor} onCheckedChange={(checked) => setAgreeMentor(Boolean(checked))} disabled={isLoading || showReviewButton} />
                                  <Label htmlFor="agree-mentor" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                      I agree to act as a mentor for new chiefs. (Must agree to proceed)
                                  </Label>
                              </div>
                          </div>
                      </>
                    )}
                </div>
            </ScrollArea>
          </div>
          {feedback && (
            <div className="p-4">
              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Guidance from The Chief</AlertTitle>
                <AlertDescription>
                  {feedback.message}
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter className="p-4 border-t bg-slate-50 rounded-b-lg justify-between">
            <div>
              {isSaving && <span className="text-sm text-muted-foreground">Saving...</span>}
            </div>
            <div>
              {!showReviewButton && (
                <>
                  <Button variant="outline" onClick={handleClose} disabled={isLoading}>Come Back Later</Button>
                  <Button className="bg-primary hover:bg-primary/90 ml-2" onClick={handleSubmitForFeedback} disabled={!allAgreed || isLoading || isFetching}>
                    {isLoading ? "Evaluating..." : "Submit to The Chief"}
                  </Button>
                </>
              )}
              {showReviewButton && (
                  <Button className="bg-primary hover:bg-primary/90" onClick={handleReviewFeedback}>
                      These answers represent my knowledge
                  </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>These answers represent my knowledge</AlertDialogTitle>
            <AlertDialogDescription>
              Do you now feel ready for a tribe?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleNeedsMoreTime}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleProceedToGraduate}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
