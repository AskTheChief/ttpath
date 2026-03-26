
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Heart, 
  Activity,
  Edit,
  Loader2,
  Trash2,
  PlusCircle,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CheckCircle2
} from 'lucide-react';
import { getPrinciples, updatePrinciples } from '@/ai/flows/relationships-principles';
import type { Principle } from '@/lib/types';
import { getRelationshipAgreements, toggleRelationshipAgreement } from '@/ai/flows/relationship-agreements';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getUserProgress } from '@/ai/flows/get-user-progress';
import { updateUserProgress } from '@/ai/flows/update-user-progress';
import * as Tone from 'tone';

const RelationshipsPage = () => {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrinciples, setEditedPrinciples] = useState<Principle[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userLevel, setUserLevel] = useState(0);
  const [userAgreements, setUserAgreements] = useState<Set<string>>(new Set());
  const [requirementsState, setRequirementsState] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  
  const isMentor = userLevel >= 6;
  const synth = useRef<Tone.PolySynth | null>(null);

  const initSynth = useCallback(() => {
    if (synth.current) return;
    synth.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.15,
          decay: 0.2,
          sustain: 0.2,
          release: 1.5
        },
        volume: -18
    }).toDestination();
  }, []);

  const playToggleSound = (isAgreed: boolean) => {
    if (Tone.context.state !== 'running') Tone.start();
    initSynth();
    if (!synth.current) return;
    const now = Tone.now();
    if (isAgreed) {
        // Gentle crystalline positive feel
        synth.current.triggerAttackRelease(["G4", "D5"], "4n", now);
    } else {
        // Subtle muted downward interval
        synth.current.triggerAttackRelease(["D4", "G3"], "8n", now);
    }
  };

  const fetchContent = useCallback(async (currentUser: User | null) => {
    setIsLoading(true);
    try {
      const content = await getPrinciples();
      setPrinciples(content);
      setEditedPrinciples(JSON.parse(JSON.stringify(content))); 

      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        const agreements = await getRelationshipAgreements({ idToken });
        setUserAgreements(new Set(agreements.agreedTitles));
        
        const progress = await getUserProgress({ idToken });
        setRequirementsState(progress.requirementsState || {});
      }
    } catch (error) {
      console.error("Failed to fetch content", error);
      toast({ title: "Error loading content", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserLevel(userDoc.data().currentUserLevel || 0);
        }
      } else {
        setUserLevel(0);
      }
      fetchContent(currentUser);
    });
    return () => unsubscribe();
  }, [fetchContent]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleEditChange = (index: number, field: keyof Principle, value: string) => {
    const newPrinciples = [...editedPrinciples];
    newPrinciples[index] = { ...newPrinciples[index], [field]: value };
    setEditedPrinciples(newPrinciples);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newPrinciples = [...editedPrinciples];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPrinciples.length) return;
    
    [newPrinciples[index], newPrinciples[targetIndex]] = [newPrinciples[targetIndex], newPrinciples[index]];
    setEditedPrinciples(newPrinciples);
  };

  const handleAddNewPrinciple = () => {
    const newPrinciple: Principle = {
      title: "New Custom",
      content: "Enter new content here...",
      img: ""
    };
    setEditedPrinciples(prev => [...prev, newPrinciple]);
  };

  const handleRemovePrinciple = (indexToRemove: number) => {
    setEditedPrinciples(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleSave = async () => {
    if (!user) {
      toast({ title: "You must be logged in to save.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const idToken = await user.getIdToken();
      const result = await updatePrinciples({ idToken, principles: editedPrinciples });
      if (result.success) {
        setPrinciples(editedPrinciples);
        setIsEditing(false);
        toast({ title: "Content updated successfully!" });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ title: "Failed to save content", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    setEditedPrinciples(JSON.parse(JSON.stringify(principles)));
    setIsEditing(false);
  };

  const handleToggleAgreement = async (title: string, agreed: boolean) => {
    if (!user) {
        toast({ title: "Please log in to record your agreement.", variant: "destructive" });
        return;
    }

    playToggleSound(agreed);

    // Optimistic update
    const newAgreements = new Set(userAgreements);
    if (agreed) newAgreements.add(title);
    else newAgreements.delete(title);
    setUserAgreements(newAgreements);

    try {
        const idToken = await user.getIdToken();
        const result = await toggleRelationshipAgreement({ idToken, title, agreed });
        if (!result.success) throw new Error(result.message);
    } catch (error: any) {
        console.error("Agreement toggle failed", error);
        toast({ title: "Failed to update agreement", description: error.message, variant: "destructive" });
        // Revert on failure
        const reverted = new Set(userAgreements);
        if (agreed) reverted.delete(title);
        else reverted.add(title);
        setUserAgreements(reverted);
    }
  };

  const handleCompleteEmbrace = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const idToken = await user.getIdToken();
      const newReqs = { ...requirementsState, 'embrace-customs': true };
      
      // Update progress in backend - preserve existing level
      await updateUserProgress({ 
        currentUserLevel: userLevel, 
        requirementsState: newReqs, 
        idToken 
      });
      
      setRequirementsState(newReqs);

      playToggleSound(true); // Confirmation sound
      toast({ title: "Communication Model studied", description: "Returning to your journey..." });
      
      // Immediate redirect back to the path journey with node auto-selection
      router.push('/?node=guest');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground selection:bg-primary/20">
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-background/90 backdrop-blur-md border-b py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3 font-bold text-lg">
            <Activity className="text-primary" size={24} />
            <span>TRADING TRIBE<span className="font-light text-muted-foreground ml-2">COMMUNICATION MODEL</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-6">
                <a href="#customs" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">Communication Model</a>
            </div>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Path
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {isMentor && (
        <div className="fixed bottom-8 right-8 z-50">
          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Content
            </Button>
          )}
        </div>
      )}

      <header className="pt-40 pb-20 px-4 sm:px-6 lg:px-8 text-center bg-background">
        <div className="max-w-5xl mx-auto flex flex-col items-center space-y-2">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground/90 uppercase leading-tight">
            The Trading Tribe
          </h1>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-primary uppercase leading-tight">
            Communication Model
          </h1>
          <p className="max-w-2xl mt-8 text-lg text-muted-foreground">
            Trading Tribe Members practice using the Trading Tribe Communication Model during Tribe meetings.
          </p>
          <p className="max-w-2xl mt-6 text-lg text-muted-foreground">
            While members may find it a bit awkward at first, they generally find it leads to clear thinking before speaking and clear communication after speaking.
          </p>
          <p className="max-w-2xl mt-6 font-medium text-foreground">
            Indicate the elements you embrace.
          </p>
        </div>
      </header>

      <section id="customs" className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {(isEditing ? editedPrinciples : principles).map((p, i) => {
              const isAgreed = userAgreements.has(p.title);
              
              return (
                <div 
                  key={i} 
                  className={cn(
                    "grid md:grid-cols-2 items-center gap-12 md:gap-16 py-8 border-b last:border-0"
                  )}
                >
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="w-full relative">
                      {p.img && (
                        <img 
                          src={p.img} 
                          alt={p.title} 
                          className="w-full h-auto max-h-[600px] object-contain"
                        />
                      )}
                       {isEditing && <Input placeholder="Image Path" value={p.img} onChange={(e) => handleEditChange(i, 'img', e.target.value)} className="mt-4" />}
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                     {isEditing ? (
                       <div className="space-y-4 bg-muted/30 p-6 rounded-lg border-2 border-dashed border-muted-foreground/20">
                          <div className="flex justify-between items-center gap-2">
                            <Input value={p.title} onChange={(e) => handleEditChange(i, 'title', e.target.value)} className="text-2xl font-bold h-auto p-2" placeholder="Title" />
                            <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => handleMove(i, 'up')} disabled={i === 0}><ArrowUp className="h-4 w-4"/></Button>
                                <Button size="icon" variant="ghost" onClick={() => handleMove(i, 'down')} disabled={i === editedPrinciples.length - 1}><ArrowDown className="h-4 w-4"/></Button>
                            </div>
                          </div>
                          <Textarea value={p.content} onChange={(e) => handleEditChange(i, 'content', e.target.value)} className="text-lg text-muted-foreground h-48 p-2" placeholder="Content" />
                          <Button variant="destructive" size="sm" onClick={() => handleRemovePrinciple(i)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Section
                          </Button>
                       </div>
                     ) : (
                       <div className="relative">
                        <div className="mb-4">
                            <h3 className="text-3xl font-bold tracking-tight">{p.title}</h3>
                        </div>
                        <div className={cn(
                            "text-lg text-muted-foreground leading-relaxed whitespace-pre-line prose prose-slate dark:prose-invert max-w-none"
                        )}>
                          {p.content}
                        </div>
                        {user && (
                            <div className="mt-8 flex flex-col gap-4">
                                <span className="text-xl font-bold text-foreground/80">I embrace this element:</span>
                                <div className="flex gap-4 items-center">
                                    <Button 
                                        variant={isAgreed ? "default" : "outline"} 
                                        size="lg"
                                        className={cn(
                                            "w-32 text-xl font-black tracking-tighter transition-all flex items-center justify-center gap-2",
                                            isAgreed ? "bg-primary hover:bg-primary/90 text-primary-foreground scale-105 shadow-md border-primary" : "text-muted-foreground"
                                        )}
                                        onClick={() => !isAgreed && handleToggleAgreement(p.title, true)}
                                    >
                                        {isAgreed && <CheckCircle2 className="h-6 w-6" />}
                                        YES
                                    </Button>
                                    <Button 
                                        variant={!isAgreed ? "destructive" : "outline"}
                                        size="lg"
                                        className={cn(
                                            "w-32 text-xl font-black tracking-tighter transition-all",
                                            !isAgreed ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground scale-105 shadow-md border-destructive" : "text-muted-foreground"
                                        )}
                                        onClick={() => isAgreed && handleToggleAgreement(p.title, false)}
                                    >
                                        NO
                                    </Button>
                                </div>
                            </div>
                        )}
                      </div>
                     )}
                  </div>
                </div>
              );
            })}
             {isEditing && (
              <div className="text-center pt-16">
                <Button size="lg" onClick={handleAddNewPrinciple}>
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Add New Element
                </Button>
              </div>
            )}
          </div>
          
          {!isEditing && user && (
            <div className="mt-24 p-8 bg-primary/10 rounded-2xl border-2 border-primary/20 text-center max-w-3xl mx-auto space-y-6">
                <h3 className="text-2xl font-bold">Review Complete</h3>
                <p className="text-muted-foreground">
                    By clicking the button below, you confirm that you have reviewed the Trading Tribe Communication Model and are ready to return to your journey.
                </p>
                <Button 
                    size="lg" 
                    className="text-xl font-bold px-12 py-8 h-auto shadow-lg"
                    onClick={handleCompleteEmbrace}
                    disabled={isSaving}
                >
                    {isSaving ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : null}
                    FINISH & RETURN TO PATH
                </Button>
            </div>
          )}
        </div>
      </section>

      <footer className="bg-background py-16 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div>
            <div className="font-bold text-2xl tracking-tight mb-2">Trading Tribe</div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trading Tribe Communication Model</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RelationshipsPage;
