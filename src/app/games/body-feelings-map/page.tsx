
'use client';

import { useState, useRef, MouseEvent, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Trash2, Loader2, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { saveFeelings, getFeelings, Feeling } from '@/ai/flows/body-feelings-map';
import Image from 'next/image';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSpring, animated } from '@react-spring/web';
import { useGesture, useDrag } from '@use-gesture/react';

// Helper to get color based on rating
const getColorFromRating = (rating: number): string => {
    if (rating === 0) return 'hsl(240, 5.9%, 10%)'; // Neutral gray for 0
    
    const maxHue = 120; // Green
    const minHue = 0; // Red

    if (rating > 0) {
        // From yellow (60) to green (120)
        const hue = 60 + (rating / 10) * (maxHue - 60);
        return `hsl(${hue}, 80%, 50%)`;
    } else {
        // From red (0) to yellow (60)
        const hue = 60 + (rating / 10) * 60;
        return `hsl(${hue}, 90%, 55%)`;
    }
};

const getOpacityFromRating = (rating: number): number => {
    return 0.5 + Math.abs(rating) / 10 * 0.5;
}


export default function BodyFeelingsMapPage() {
  const [allFeelings, setAllFeelings] = useState<Feeling[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFeeling, setCurrentFeeling] = useState<Partial<Feeling>>({});
  const [editingFeelingId, setEditingFeelingId] = useState<number | null>(null);
  const [clickCoords, setClickCoords] = useState<{ x: number, y: number } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [selectedFeelingName, setSelectedFeelingName] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Feeling | null>(null);
  
  const imageContainerRef = useRef<HTMLDivElement>(null);
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
          setAllFeelings(savedFeelings);
        } catch (error) {
          console.error("Failed to load feelings:", error);
          toast({ title: "Error", description: "Could not load your saved feelings map.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      } else {
        setAllFeelings([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [toast]);
  
  // Debounced save function
  const debouncedSave = useCallback(() => {
    if (isLoading || !user) return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
  
    debounceTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const idToken = await user.getIdToken();
        await saveFeelings({ idToken, feelings: allFeelings });
      } catch (error) {
        console.error("Failed to save feelings:", error);
        toast({ title: "Save Error", description: "Could not save your changes automatically.", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  }, [allFeelings, user, toast, isLoading]);

  useEffect(() => {
    debouncedSave();
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [allFeelings, debouncedSave]);


  const handleMapClick = (e: MouseEvent<HTMLDivElement>, style: any) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    
    // Calculate click position relative to the container
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Invert the transformation to find the original coordinates on the image
    const transformedX = (clickX - style.x.get()) / style.scale.get();
    const transformedY = (clickY - style.y.get()) / style.scale.get();

    // Convert to percentage
    const x = (transformedX / imageContainerRef.current.clientWidth) * 100;
    const y = (transformedY / imageContainerRef.current.clientHeight) * 100;

    // Sensation-first workflow
    setClickCoords({ x, y });
    setCurrentFeeling({ rating: 0 }); // Default rating
    setEditingFeelingId(null);
    setIsModalOpen(true);
  };
  
  const handleSaveFeeling = () => {
    if (!currentFeeling.feelingName || !currentFeeling.sensation) {
        toast({ title: "Incomplete Form", description: "Please fill out all fields.", variant: "destructive" });
        return;
    }

    const standardizedFeelingName = currentFeeling.feelingName.charAt(0).toUpperCase() + currentFeeling.feelingName.slice(1).toLowerCase();

    if (editingFeelingId !== null) {
        setAllFeelings(allFeelings.map(f => f.id === editingFeelingId ? { ...f, ...currentFeeling, feelingName: standardizedFeelingName } as Feeling : f));
        toast({ title: "Feeling Updated" });
    } else if (clickCoords) {
        const newFeeling: Feeling = {
            id: Date.now(),
            feelingName: standardizedFeelingName,
            sensation: currentFeeling.sensation,
            rating: currentFeeling.rating ?? 0,
            x: clickCoords.x,
            y: clickCoords.y,
        };
        setAllFeelings([...allFeelings, newFeeling]);
    }

    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentFeeling({});
    setClickCoords(null);
    setEditingFeelingId(null);
  };
  
  const handleDeleteFeeling = (id: number) => {
    setAllFeelings(allFeelings.filter(f => f.id !== id));
  };
  
  const openEditModal = (feeling: Feeling, e?: MouseEvent) => {
    e?.stopPropagation();
    setEditingFeelingId(feeling.id);
    setCurrentFeeling(feeling);
    setIsModalOpen(true);
  };
  
  const handleDotClickForLocationView = (feeling: Feeling, e: MouseEvent) => {
    e.stopPropagation();
    setActiveTab('location');
    setSelectedLocation(feeling);
  };
  
  const displayedFeelings = useMemo(() => {
    if (activeTab === 'feeling' && selectedFeelingName) {
      return allFeelings.filter(f => f.feelingName === selectedFeelingName);
    }
    return allFeelings;
  }, [activeTab, selectedFeelingName, allFeelings]);

  const uniqueFeelingNames = useMemo(() => {
    const names = new Set(allFeelings.map(f => f.feelingName));
    return Array.from(names).sort();
  }, [allFeelings]);

  const feelingsAtSelectedLocation = useMemo(() => {
    if (activeTab === 'location' && selectedLocation) {
        // Find all feelings within a small radius of the selected location
        return allFeelings.filter(f => {
            const dx = f.x - selectedLocation.x;
            const dy = f.y - selectedLocation.y;
            return Math.sqrt(dx * dx + dy * dy) < 1; // 1% radius
        });
    }
    return [];
  }, [activeTab, selectedLocation, allFeelings]);


  return (
    <div className="bg-background dark:bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Body Feelings Map</h1>
            <p className="text-muted-foreground">Log feelings, link them to sensations, and see your inventory.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/games"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Game Center</Link>
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="inventory">Total Inventory</TabsTrigger>
                <TabsTrigger value="feeling">View by Feeling</TabsTrigger>
                <TabsTrigger value="location">View by Location</TabsTrigger>
            </TabsList>
            <TabsContent value="inventory" className="mt-4">
                <ViewLayout
                    title="Total Inventory"
                    description="Drag to pan. Pinch or Ctrl+Scroll to zoom. Click the body to add a feeling."
                    feelings={allFeelings}
                    openEditModal={openEditModal}
                    handleMapClick={handleMapClick}
                    imageContainerRef={imageContainerRef}
                    isSaving={isSaving}
                    isLoading={isLoading}
                    user={user}
                    handleDeleteFeeling={handleDeleteFeeling}
                />
            </TabsContent>
            <TabsContent value="feeling" className="mt-4">
                <ViewLayout
                    title="View by Feeling"
                    description="Select a feeling to see all associated sensations on the map."
                    feelings={displayedFeelings}
                    openEditModal={openEditModal}
                    handleMapClick={handleMapClick}
                    imageContainerRef={imageContainerRef}
                    isSaving={isSaving}
                    isLoading={isLoading}
                    user={user}
                    handleDeleteFeeling={handleDeleteFeeling}
                    controls={
                        <Select onValueChange={setSelectedFeelingName} value={selectedFeelingName || ''}>
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="Select a feeling..." />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueFeelingNames.map(name => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    }
                />
            </TabsContent>
            <TabsContent value="location" className="mt-4">
                 <ViewLayout
                    title="View by Location"
                    description="Click a dot on the map to see all feelings at that location."
                    feelings={allFeelings}
                    openEditModal={openEditModal}
                    handleMapClick={handleDotClickForLocationView}
                    imageContainerRef={imageContainerRef}
                    isSaving={isSaving}
                    isLoading={isLoading}
                    user={user}
                    handleDeleteFeeling={handleDeleteFeeling}
                    sidebarContent={
                        <Card>
                             <CardHeader>
                                <CardTitle>Feelings at Location</CardTitle>
                                {selectedLocation && <CardDescription>Sensation: {selectedLocation.sensation}</CardDescription>}
                            </CardHeader>
                            <CardContent>
                                {feelingsAtSelectedLocation.length > 0 ? (
                                    <ul className="space-y-2">
                                        {feelingsAtSelectedLocation.map(f => (
                                            <li key={f.id} className="flex items-center gap-2 p-2 border rounded">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColorFromRating(f.rating) }}></div>
                                                <span>{f.feelingName} (Rating: {f.rating})</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No location selected. Click a dot on the map.</p>
                                )}
                            </CardContent>
                        </Card>
                    }
                />
            </TabsContent>
        </Tabs>
      </div>

       <Dialog open={isModalOpen} onOpenChange={closeModal}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingFeelingId ? 'Edit Feeling' : 'Log a New Feeling'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="feeling-name">Feeling Name</Label>
                        <Input id="feeling-name" value={currentFeeling.feelingName || ''} onChange={e => setCurrentFeeling(p => ({...p, feelingName: e.target.value}))} placeholder="e.g., Anger, Joy, Sadness" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="feeling-sensation">Sensation Description</Label>
                        <Textarea id="feeling-sensation" value={currentFeeling.sensation || ''} onChange={e => setCurrentFeeling(p => ({...p, sensation: e.target.value}))} placeholder="e.g., Tightness in chest, warmth in stomach" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="feeling-rating">Like / Dislike Rating ({currentFeeling.rating ?? 0})</Label>
                        <div className="flex items-center gap-4">
                            <span className="text-red-500 font-bold">-10</span>
                            <Slider
                                id="feeling-rating"
                                min={-10}
                                max={10}
                                step={1}
                                value={[currentFeeling.rating ?? 0]}
                                onValueChange={([val]) => setCurrentFeeling(p => ({ ...p, rating: val }))}
                            />
                             <span className="text-green-500 font-bold">+10</span>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeModal}>Cancel</Button>
                    <Button onClick={handleSaveFeeling}>{editingFeelingId ? 'Update Feeling' : 'Save Feeling'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

function ViewLayout({ title, description, feelings, openEditModal, handleMapClick, imageContainerRef, isSaving, isLoading, user, controls, sidebarContent, handleDeleteFeeling }: {
    title: string;
    description: string;
    feelings: Feeling[];
    openEditModal: (feeling: Feeling, e?: MouseEvent) => void;
    handleMapClick: (e: MouseEvent<HTMLDivElement> | MouseEvent<HTMLDivElement, globalThis.MouseEvent>, style: any) => void;
    imageContainerRef: React.RefObject<HTMLDivElement>;
    isSaving: boolean;
    isLoading: boolean;
    user: User | null;
    controls?: React.ReactNode;
    sidebarContent?: React.ReactNode;
    handleDeleteFeeling: (id: number) => void;
}) {
    const [{ x, y, scale }, api] = useSpring(() => ({
        x: 0,
        y: 0,
        scale: 1,
    }));

    useDrag(
        ({ offset: [dx, dy] }) => {
          api.start({ x: dx, y: dy });
        },
        { 
            target: imageContainerRef,
            from: () => [x.get(), y.get()],
        }
    );

     useGesture(
        {
            onPinch: ({ offset: [s] }) => {
              api.start({ scale: s });
            },
            onWheel: ({ event, delta: [, dy], ctrlKey }) => {
                if (ctrlKey) {
                    event.preventDefault();
                    api.start({ scale: scale.get() - dy / 200 });
                }
            },
        },
        {
            target: imageContainerRef,
            pinch: { from: () => [scale.get(), 0] },
            wheel: { eventOptions: { passive: false } },
        }
    );

    const resetView = () => {
        api.start({ x: 0, y: 0, scale: 1 });
    };

    return (
        <div className="grid md:grid-cols-3 gap-8">
            <Card className="md:col-span-2">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                            {controls}
                            <Button variant="outline" size="icon" onClick={resetView} title="Reset View">
                                <RotateCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0 relative overflow-hidden">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full aspect-[1/2]"><Loader2 className="h-12 w-12 animate-spin" /></div>
                    ) : (
                      <div
                        ref={imageContainerRef}
                        className="w-full mx-auto cursor-pointer aspect-[1/2]"
                        onClick={(e) => {
                            // Check if the click was part of a drag by looking at the target.
                            // The animated.div will be the target during a drag.
                            // A simple click's target is more likely the container or an element inside.
                            if (e.target === e.currentTarget || e.target === imageContainerRef.current?.firstChild) {
                                handleMapClick(e, {x, y, scale})
                            }
                        }}
                        >
                            <animated.div style={{x, y, scale}} className="relative w-full h-full touch-none">
                                <Image src="/games/bodies.svg" alt="Body outline" fill style={{ objectFit: 'contain' }} className="filter dark:invert"/>
                                {feelings.map(feeling => (
                                    <div
                                    key={feeling.id}
                                    className="absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 transform hover:scale-150 transition-transform duration-150 cursor-pointer border-2 border-white/50 feeling-dot"
                                    style={{ 
                                        left: `${feeling.x}%`, 
                                        top: `${feeling.y}%`, 
                                        backgroundColor: getColorFromRating(feeling.rating),
                                        opacity: getOpacityFromRating(feeling.rating),
                                    }}
                                    onClick={(e) => openEditModal(feeling, e)}
                                    />
                                ))}
                            </animated.div>
                      </div>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Feelings Inventory
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </CardTitle>
                        <CardDescription>A list of all feelings you've logged.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : feelings.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                {user ? 'Click on the body map to add your first feeling.' : 'Log in to save your progress.'}
                            </p>
                        ) : (
                            <ul className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {feelings.map(feeling => (
                                    <li key={feeling.id} className="p-3 border rounded-lg bg-background">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: getColorFromRating(feeling.rating) }}></div>
                                                <div>
                                                    <h4 className="font-semibold">{feeling.feelingName} <span className="font-normal">({feeling.rating})</span></h4>
                                                    <p className="text-sm text-muted-foreground">{feeling.sensation}</p>
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
                {sidebarContent}
            </div>
        </div>
    );
}
