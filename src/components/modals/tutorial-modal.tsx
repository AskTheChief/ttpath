
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { evaluateTutorialAnswers } from "@/ai/flows/evaluate-tutorial-answers";
import { saveTutorialAnswers } from "@/ai/flows/save-tutorial-answers";
import { getTutorialAnswers } from "@/lib/tutorial";
import { tutorialQuestions } from "@/lib/data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

type TutorialModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (reqId: string) => void;
};

export default function TutorialModal({ isOpen, onClose, onComplete }: TutorialModalProps) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [agreeMeetings, setAgreeMeetings] = useState(false);
  const [agreeMentor, setAgreeMentor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [feedback, setFeedback] = useState<{ passed: boolean; message: string } | null>(null);

  useEffect(() => {
    async function fetchAnswers() {
      if (isOpen) {
        setIsFetching(true);
        setFeedback(null);
        try {
          const existingAnswers = await getTutorialAnswers({});
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
      }
    }
    fetchAnswers();
  }, [isOpen, toast]);

  const allAgreed = agreeMeetings && agreeMentor;

  const handleAnswerChange = (question: string, value: string) => {
    setAnswers(prev => ({ ...prev, [question]: value }));
  };
  
  const handleSubmit = async () => {
    if (!allAgreed) {
      toast({
        title: "Agreement Required",
        description: "You must agree to both statements to proceed.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setFeedback(null);

    try {
      const saveResult = await saveTutorialAnswers({ answers });
      if (!saveResult.success) {
        throw new Error("Failed to save your answers. Please try again.");
      }
      
      toast({
        title: "Answers Saved",
        description: "The Chief is now reviewing your submission.",
      });

      const evaluation = await evaluateTutorialAnswers({ answers });
      
      if (evaluation.passed) {
        toast({
          title: "Tutorial Submitted!",
          description: evaluation.feedback,
        });
        onComplete("complete-tutorial");
        onClose();
      } else {
        setFeedback({ passed: false, message: evaluation.feedback });
      }
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
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-2xl font-bold text-slate-800">Tutorial Study Guide</DialogTitle>
          <DialogDescription>
            Answer the questions below to complete the tutorial. Your answers save as you go. The Chief will review your responses upon submission.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                  {isFetching ? (
                    <p>Loading your answers...</p>
                  ) : (
                    <>
                      {feedback && !feedback.passed && (
                        <Alert variant="destructive">
                          <Terminal className="h-4 w-4" />
                          <AlertTitle>Feedback from The Chief</AlertTitle>
                          <AlertDescription>
                            {feedback.message}
                          </AlertDescription>
                        </Alert>
                      )}
                      {tutorialQuestions.map((q, i) => (
                          <div key={i} className="space-y-2">
                              <Label htmlFor={`q${i}`} className="text-md font-medium text-slate-700">{`${i + 1}. ${q}`}</Label>
                              <Textarea 
                                id={`q${i}`} 
                                rows={3}
                                value={answers[q] || ''}
                                onChange={(e) => handleAnswerChange(q, e.target.value)}
                                disabled={isLoading}
                                placeholder="Your thoughtful answer..."
                              />
                          </div>
                      ))}
                      <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-start space-x-3">
                                <Checkbox id="agree-meetings" checked={agreeMeetings} onCheckedChange={(checked) => setAgreeMeetings(Boolean(checked))} disabled={isLoading} />
                                <Label htmlFor="agree-meetings" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    I agree to participate fully in all meetings and to submit reports promptly. (Must Agree to Proceed)
                                </Label>
                            </div>
                            <div className="flex items-start space-x-3">
                                <Checkbox id="agree-mentor" checked={agreeMentor} onCheckedChange={(checked) => setAgreeMentor(Boolean(checked))} disabled={isLoading} />
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
        <DialogFooter className="p-4 border-t bg-slate-50 rounded-b-lg">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>Cancel</Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={!allAgreed || isLoading || isFetching}>
            {isLoading ? "Evaluating..." : "Submit to The Chief"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
