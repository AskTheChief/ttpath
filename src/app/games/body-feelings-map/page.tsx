
'use client';

import { useState, useRef, MouseEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { saveFeelings, getFeelings } from '@/ai/flows/body-feelings-map';
import { Loader2 } from 'lucide-react';

type Feeling = {
  id: number;
  name: string;
  sensation: string;
  metaFeeling: string;
  x: number;
  y: number;
  color: string;
};

const feelingColors = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#FBBF24', // Amber
    '#84CC16', // Lime
    '#22C55E', // Green
    '#14B8A6', // Teal
    '#3B82F6', // Blue
    '#8B5CF6', // Violet
    '#EC4899', // Pink
];

export default function BodyFeelingsMapPage() {
  const [feelings, setFeelings] = useState<Feeling[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFeeling, setCurrentFeeling] = useState<Partial<Feeling>>({});
  const [clickCoords, setClickCoords] = useState<{ x: number, y: number } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const { toast } = useToast();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auth and initial data fetching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsLoading(true);
        try {
          const idToken = await currentUser.getIdToken();
          const savedFeelings = await getFeelings({ idToken });
          setFeelings(savedFeelings);
        } catch (error) {
          console.error("Failed to load feelings:", error);
          toast({
            title: "Error",
            description: "Could not load your saved feelings map.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        setFeelings([]); // Clear feelings for logged-out users
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [toast]);
  
  // Debounced save function
  useEffect(() => {
    if (isLoading || !user) {
      return;
    }
  
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  
    debounceTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const idToken = await user.getIdToken();
        await saveFeelings({ idToken, feelings });
      } catch (error) {
        console.error("Failed to save feelings:", error);
        toast({
          title: "Save Error",
          description: "Could not save your changes.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }, 1500); // 1.5-second debounce delay
  
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [feelings, user, toast, isLoading]);


  const handleMapClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - svgRect.left) / svgRect.width) * 100;
    const y = ((e.clientY - svgRect.top) / svgRect.height) * 100;
    setClickCoords({ x, y });
    setCurrentFeeling({ color: feelingColors[0] });
    setIsModalOpen(true);
  };
  
  const handleSaveFeeling = () => {
    if (!currentFeeling.name || !currentFeeling.sensation || !currentFeeling.metaFeeling || !currentFeeling.color || !clickCoords) {
        toast({
            title: "Incomplete Form",
            description: "Please fill out all fields and select a color.",
            variant: "destructive"
        });
        return;
    }
    const newFeeling: Feeling = {
        id: Date.now(),
        name: currentFeeling.name,
        sensation: currentFeeling.sensation,
        metaFeeling: currentFeeling.metaFeeling,
        x: clickCoords.x,
        y: clickCoords.y,
        color: currentFeeling.color,
    };
    setFeelings([...feelings, newFeeling]);
    setIsModalOpen(false);
    setCurrentFeeling({});
    setClickCoords(null);
  };
  
  const handleDeleteFeeling = (id: number) => {
    setFeelings(feelings.filter(f => f.id !== id));
  };


  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Body Feelings Map</h1>
            <p className="text-muted-foreground">An interactive tool to take inventory of your feelings.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/games">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Game Center
            </Link>
          </Button>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Your Feelings Map</CardTitle>
                    <CardDescription>
                      {user 
                        ? "Click on the body outline where you feel a sensation to log it. Your progress saves automatically." 
                        : "Log in to save your progress. Click on the body outline to begin."
                      }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full aspect-[2/3]">
                          <Loader2 className="h-12 w-12 animate-spin" />
                      </div>
                    ) : (
                      <div className="relative w-full max-w-md mx-auto aspect-[2/3] cursor-pointer">
                          <svg
                              ref={svgRef}
                              viewBox="0 0 200 300"
                              className="w-full h-full"
                              onClick={handleMapClick}
                          >
                            <path
                                d="M100,50 C113.8,50 125,61.2 125,75 C125,88.8 113.8,100 100,100 C86.2,100 75,88.8 75,75 C75,61.2 86.2,50 100,50 Z M 100,100 Q 100,105 90,120 L 90,180 Q 90,190 80,200 L 70,280 Q 70,290 80,290 L 120,290 Q 130,290 130,280 L 120,200 Q 110,190 110,180 L 110,120 Q 100,105 100,100 M 100,120 L 180,170 M 100,120 L 20,170"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                          </svg>
                          {feelings.map(feeling => (
                            <div
                              key={feeling.id}
                              className="absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2"
                              style={{ left: `${feeling.x}%`, top: `${feeling.y}%`, backgroundColor: feeling.color }}
                            />
                          ))}
                      </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Feelings Inventory
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </CardTitle>
                    <CardDescription>A list of the feelings you've logged.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : feelings.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Click on the body map to add your first feeling.</p>
                    ) : (
                        <ul className="space-y-4">
                            {feelings.map(feeling => (
                                <li key={feeling.id} className="p-3 border rounded-lg bg-background">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: feeling.color }}></div>
                                            <div>
                                                <h4 className="font-semibold">{feeling.name}</h4>
                                                <p className="text-sm text-muted-foreground">{feeling.sensation}</p>
                                                <p className="text-sm mt-1"><i>Feeling about this: "{feeling.metaFeeling}"</i></p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDeleteFeeling(feeling.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>

       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log a New Feeling</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="feeling-name">What is the name of the feeling?</Label>
                        <Input id="feeling-name" value={currentFeeling.name || ''} onChange={e => setCurrentFeeling(p => ({...p, name: e.target.value}))} placeholder="e.g., Anxiety, Joy, Sadness" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="feeling-sensation">Describe the physical sensation.</Label>
                        <Textarea id="feeling-sensation" value={currentFeeling.sensation || ''} onChange={e => setCurrentFeeling(p => ({...p, sensation: e.target.value}))} placeholder="e.g., Tightness in chest, warmth in stomach" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="meta-feeling">How do you feel about this feeling?</Label>
                        <Input id="meta-feeling" value={currentFeeling.metaFeeling || ''} onChange={e => setCurrentFeeling(p => ({...p, metaFeeling: e.target.value}))} placeholder="e.g., Ashamed, accepting, frustrated" />
                    </div>
                    <div className="space-y-2">
                        <Label>Choose a color</Label>
                        <div className="flex flex-wrap gap-2">
                            {feelingColors.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-transform transform",
                                        currentFeeling.color === color ? 'border-foreground scale-110' : 'border-transparent'
                                    )}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setCurrentFeeling(p => ({...p, color: color }))}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveFeeling}>Save Feeling</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
