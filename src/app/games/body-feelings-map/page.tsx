
'use client';

import { useState, useRef, MouseEvent } from 'react';
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

type Feeling = {
  id: number;
  name: string;
  sensation: string;
  metaFeeling: string;
  x: number;
  y: number;
};

export default function BodyFeelingsMapPage() {
  const [feelings, setFeelings] = useState<Feeling[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFeeling, setCurrentFeeling] = useState<Partial<Feeling>>({});
  const [clickCoords, setClickCoords] = useState<{ x: number, y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { toast } = useToast();

  const handleMapClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    // Normalize coordinates to be percentage-based (0-100)
    const x = ((e.clientX - svgRect.left) / svgRect.width) * 100;
    const y = ((e.clientY - svgRect.top) / svgRect.height) * 100;
    setClickCoords({ x, y });
    setCurrentFeeling({});
    setIsModalOpen(true);
  };
  
  const handleSaveFeeling = () => {
    if (!currentFeeling.name || !currentFeeling.sensation || !currentFeeling.metaFeeling || !clickCoords) {
        toast({
            title: "Incomplete Form",
            description: "Please fill out all fields for the feeling.",
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
                    <CardDescription>Click on the body outline where you feel a sensation to log it.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full max-w-md mx-auto aspect-[2/3] cursor-pointer">
                        <svg
                            ref={svgRef}
                            viewBox="0 0 200 300"
                            className="w-full h-full"
                            onClick={handleMapClick}
                        >
                            <path d="M100 20C70 20 60 50 60 70C60 90 70 100 70 120L75 180L70 280L90 280L95 180L105 180L110 280L130 280L125 180L130 120C130 100 140 90 140 70C140 50 130 20 100 20Z" fill="none" stroke="currentColor" strokeWidth="2" />
                            <circle cx="100" cy="45" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path d="M70 120L40 180L30 270L50 270L55 200L75 180" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path d="M130 120L160 180L170 270L150 270L145 200L125 180" fill="none" stroke="currentColor" strokeWidth="2" />
                        </svg>

                        {feelings.map(feeling => (
                           <div
                             key={feeling.id}
                             className="absolute w-3 h-3 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                             style={{ left: `${feeling.x}%`, top: `${feeling.y}%` }}
                           />
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Feelings Inventory</CardTitle>
                    <CardDescription>A list of the feelings you've logged.</CardDescription>
                </CardHeader>
                <CardContent>
                    {feelings.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Click on the body map to add your first feeling.</p>
                    ) : (
                        <ul className="space-y-4">
                            {feelings.map(feeling => (
                                <li key={feeling.id} className="p-3 border rounded-lg bg-background">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold">{feeling.name}</h4>
                                            <p className="text-sm text-muted-foreground">{feeling.sensation}</p>
                                            <p className="text-sm mt-1"><i>Feeling about this: "{feeling.metaFeeling}"</i></p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteFeeling(feeling.id)}>
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
