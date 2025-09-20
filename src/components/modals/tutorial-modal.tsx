"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const tutorialQuestions = [
    "Explain how judgment effects communication.",
    "Describe the positive intentions of fear, anger and envy.",
    "Describe three things that exist in the past and three more that exist in the future.",
    'Explain the meaning of "Intentions = Results."',
    'Explain how the "Healing Field of Acknowledgment” works',
    "Explain the importance of willingness testing.",
    'Provide an example of a "medicinal rock" and a "proactive rock."',
    'Explain the purpose of the "Rocks Process."',
    "Explain the difference between the causal model and the feedback model.",
    "Explain the purpose in following SVOP-b syntax.",
    'Explain how "emotional honesty" differs from “objective truth.”',
    "State the purpose of The Trading Tribe.",
    "Explain how the tribe implements accountability.",
    "Describe a personal issue you wish to bring to Tribe.",
    "Describe what you do with your life to serve others."
];

type TutorialModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (reqId: string) => void;
};

export default function TutorialModal({ isOpen, onClose, onComplete }: TutorialModalProps) {
  const { toast } = useToast();
  
  const handleSubmit = () => {
    // In a real app, you would submit the answers.
    // Here we just complete the requirement.
    onComplete("complete-tutorial");
    toast({
      title: "Tutorial Submitted!",
      description: "Your answers are being reviewed. You can now proceed.",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-2xl font-bold text-slate-800">Tutorial Study Guide</DialogTitle>
          <DialogDescription>
            Answer the questions below to complete the tutorial.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                  {tutorialQuestions.map((q, i) => (
                      <div key={i} className="space-y-2">
                          <Label htmlFor={`q${i}`} className="text-md font-medium text-slate-700">{`${i + 1}. ${q}`}</Label>
                          <Textarea id={`q${i}`} rows={3} />
                      </div>
                  ))}
              </div>
          </ScrollArea>
        </div>
        <DialogFooter className="p-4 border-t bg-slate-50 rounded-b-lg">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={handleSubmit}>Submit Answers</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
