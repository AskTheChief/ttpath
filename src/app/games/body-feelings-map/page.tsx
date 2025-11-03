
'use client';

import { useState, useRef, MouseEvent, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { saveFeelings, getFeelings, Feeling } from '@/ai/flows/body-feelings-map';
import Image from 'next/image';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGesture } from '@use-gesture/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


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

const initialViewBox = { x: 80, y: 150, width: 340, height: 700 };


export default function BodyFeelingsMapPage() {
  const [allFeelings, setAllFeelings] = useState<Feeling[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFeeling, setCurrentFeeling] = useState<Partial<Feeling>>({});
  const [editingFeelingId, setEditingFeelingId] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [selectedFeelingName, setSelectedFeelingName] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Feeling | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const { toast } = useToast();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [viewBox, setViewBox] = useState(initialViewBox);

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


  const handleMapClick = (e: MouseEvent<SVGSVGElement>) => {
    if (e.target !== svgRef.current) return;
    if (!svgRef.current) return;
    
    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;

    const transformedPoint = svgPoint.matrixTransform(svgRef.current.getScreenCTM()!.inverse());

    const newFeelingPartial: Partial<Feeling> = {
      x: transformedPoint.x,
      y: transformedPoint.y,
      rating: 0,
    };

    setCurrentFeeling(newFeelingPartial);
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
    } else if (currentFeeling.x !== undefined && currentFeeling.y !== undefined) {
        const newFeeling: Feeling = {
            id: Date.now(),
            feelingName: standardizedFeelingName,
            sensation: currentFeeling.sensation,
            rating: currentFeeling.rating ?? 0,
            x: currentFeeling.x,
            y: currentFeeling.y,
        };
        setAllFeelings([...allFeelings, newFeeling]);
    }

    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentFeeling({});
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
            return Math.sqrt(dx * dx + dy * dy) < 5; // Radius in SVG units
        });
    }
    return [];
  }, [activeTab, selectedLocation, allFeelings]);


  return (
    <div className="p-4 sm:p-6 lg:p-8">
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
                    description="Click the body to add a feeling. Pinch/scroll to zoom, drag to pan."
                    feelings={allFeelings}
                    openEditModal={openEditModal}
                    handleMapClick={handleMapClick}
                    svgRef={svgRef}
                    isSaving={isSaving}
                    isLoading={isLoading}
                    user={user}
                    handleDeleteFeeling={handleDeleteFeeling}
                    viewBox={viewBox}
                    setViewBox={setViewBox}
                />
            </TabsContent>
            <TabsContent value="feeling" className="mt-4">
                <ViewLayout
                    title="View by Feeling"
                    description="Select a feeling to see all associated sensations on the map."
                    feelings={displayedFeelings}
                    openEditModal={openEditModal}
                    handleMapClick={handleMapClick}
                    svgRef={svgRef}
                    isSaving={isSaving}
                    isLoading={isLoading}
                    user={user}
                    handleDeleteFeeling={handleDeleteFeeling}
                    viewBox={viewBox}
                    setViewBox={setViewBox}
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
                    handleMapClick={(e) => {
                        const target = e.target as SVGCircleElement;
                        if (target.tagName === 'circle') {
                            const id = Number(target.dataset.id);
                            const feeling = allFeelings.find(f => f.id === id);
                            if (feeling) {
                                handleDotClickForLocationView(feeling, e as any);
                            }
                        } else {
                            handleMapClick(e as any);
                        }
                    }}
                    svgRef={svgRef}
                    isSaving={isSaving}
                    isLoading={isLoading}
                    user={user}
                    handleDeleteFeeling={handleDeleteFeeling}
                    viewBox={viewBox}
                    setViewBox={setViewBox}
                    sidebarContent={
                        <Card>
                             <CardHeader>
                                <CardTitle>Feelings at Location</CardTitle>
                                {selectedLocation && <CardDescription>Feelings around this point.</CardDescription>}
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

function ViewLayout({ title, description, feelings, openEditModal, handleMapClick, svgRef, isSaving, isLoading, user, controls, sidebarContent, handleDeleteFeeling, viewBox, setViewBox }: {
    title: string;
    description: string;
    feelings: Feeling[];
    openEditModal: (feeling: Feeling, e?: MouseEvent) => void;
    handleMapClick: (e: MouseEvent<SVGSVGElement>) => void;
    svgRef: React.RefObject<SVGSVGElement>;
    isSaving: boolean;
    isLoading: boolean;
    user: User | null;
    controls?: React.ReactNode;
    sidebarContent?: React.ReactNode;
    handleDeleteFeeling: (id: number) => void;
    viewBox: { x: number; y: number; width: number; height: number; };
    setViewBox: (viewBox: { x: number; y: number; width: number; height: number; }) => void;
}) {
    const startViewBox = useRef(viewBox);

    useGesture(
        {
            onDrag: ({ tap, pinching, movement: [dx, dy] }) => {
              if (pinching) return;
              if (tap) {
                handleMapClick(event as unknown as MouseEvent<SVGSVGElement>);
                return;
              }

              const svg = svgRef.current;
              if (!svg) return;
      
              const scaleRatio = viewBox.width / svg.clientWidth;
      
              setViewBox({
                x: startViewBox.current.x - dx * scaleRatio,
                y: startViewBox.current.y - dy * scaleRatio,
                width: viewBox.width,
                height: viewBox.height,
              });
            },
            onDragStart: () => {
              startViewBox.current = viewBox;
            },
            onWheel: ({ event, delta: [, dy] }) => {
                event.preventDefault();
                const zoomFactor = 0.001;
                const scale = 1 + dy * zoomFactor;

                const newWidth = viewBox.width * scale;
                const newHeight = viewBox.height * scale;

                if (newWidth < 20 || newWidth > 2000) return;

                const svg = svgRef.current;
                if (!svg) return;

                const mousePoint = svg.createSVGPoint();
                mousePoint.x = (event as WheelEvent).clientX;
                mousePoint.y = (event as WheelEvent).clientY;
                const svgMousePoint = mousePoint.matrixTransform(svg.getScreenCTM()!.inverse());
                
                const newX = svgMousePoint.x - (svgMousePoint.x - viewBox.x) * scale;
                const newY = svgMousePoint.y - (svgMousePoint.y - viewBox.y) * scale;

                const newViewBox = { x: newX, y: newY, width: newWidth, height: newHeight };
                setViewBox(newViewBox);
            }
        },
        {
            target: svgRef,
            eventOptions: { passive: false },
            drag: {
                filterTaps: true,
            },
        }
    );
    
    const resetView = () => {
        setViewBox(initialViewBox);
    };
    
    const circleRadius = 12 * (viewBox.width / initialViewBox.width);


    return (
        <TooltipProvider>
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
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" onClick={resetView}>
                                            <RefreshCw className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Reset View</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0 relative">
                        {isLoading ? (
                        <div className="flex items-center justify-center h-[600px]"><Loader2 className="h-12 w-12 animate-spin" /></div>
                        ) : (
                        <div className="w-full h-[600px] mx-auto relative touch-none bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                            <svg
                                ref={svgRef}
                                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                                className="w-full h-full"
                                onClick={handleMapClick}
                            >
                                <image href="/games/bodies.svg" x="0" y="0" width="500" height="1000" className="filter dark:invert pointer-events-none"/>

                                {feelings.map(feeling => (
                                    <Tooltip key={feeling.id}>
                                        <TooltipTrigger asChild>
                                            <circle
                                            data-id={feeling.id}
                                            cx={feeling.x}
                                            cy={feeling.y}
                                            r={circleRadius}
                                            fill={getColorFromRating(feeling.rating)}
                                            fillOpacity={getOpacityFromRating(feeling.rating)}
                                            stroke="white"
                                            strokeWidth={1.5 * (viewBox.width / initialViewBox.width)}
                                            className="cursor-pointer transition-all duration-150 hover:r-[10]"
                                            onClick={(e) => openEditModal(feeling, e as any)}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{feeling.feelingName}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </svg>
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
        </TooltipProvider>
    );
}

    

    




