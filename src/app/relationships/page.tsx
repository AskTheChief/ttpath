
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { getPrinciples, updatePrinciples, type Principle } from '@/ai/flows/relationships-principles';
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
        setUserAgreements(reverted);
    }
  };

  const handleCompleteEmbrace = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const idToken = await user.getIdToken();
      const progress = await getUserProgress({ idToken });
      const newReqs = { ...progress.requirementsState, 'embrace-customs': true };
      await updateUserProgress({ 
        currentUserLevel: progress.currentUserLevel, 
        requirementsState: newReqs, 
        idToken 
      });
      toast({ title: "Customs Embraced!", description: "Requirement complete. You may now continue on the Path." });
      router.push('/');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const allEmbraced = useMemo(() => {
    return principles.length > 0 && userAgreements.size >= principles.length;
  }, [principles, userAgreements]);

  const hasCompletedRequirement = requirementsState['embrace-customs'] === true;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground selection:bg-primary/20">
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-background/90 backdrop-blur-md border-b py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3 font-bold text-lg">
            <Activity className="text-primary" size={24} />
            <span>TRADING TRIBE<span className="font-light text-muted-foreground ml-2">CUSTOMS</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-6">
                <a href="#customs" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">Customs</a>
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
              <Edit className="mr-2 h-4 w-4" /> Edit Customs
            </Button>
          )}
        </div>
      )}

      <header className="pt-40 pb-20 px-4 sm:px-6 lg:px-8 text-center bg-background">
        <div className="max-w-5xl mx-auto flex flex-col items-center space-y-2">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground/90 uppercase leading-tight">
            Trading Tribe
          </h1>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-primary uppercase leading-tight">
            Customs
          </h1>
          <p className="max-w-2xl mt-8 text-lg text-muted-foreground">
            The Trading Tribe relies on shared customs to maintain a safe and productive environment for all members. Guests must embrace these customs before proceeding to become Explorers.
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
                    "grid md:grid-cols-2 items-center gap-12 md:gap-16 py-8 border-b last:border-0",
                    isAgreed && "opacity-80 transition-opacity"
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
                            "text-lg text-muted-foreground leading-relaxed whitespace-pre-line prose prose-slate dark:prose-invert max-w-none",
                            isAgreed && "text-muted-foreground/60"
                        )}>
                          {p.content}
                        </div>
                        {user && (
                            <div className="mt-8 flex items-center gap-3">
                                <Checkbox 
                                    id={`agree-${i}`} 
                                    checked={isAgreed}
                                    onCheckedChange={(checked) => handleToggleAgreement(p.title, !!checked)}
                                    className="h-6 w-6 border-2"
                                />
                                <Label 
                                    htmlFor={`agree-${i}`} 
                                    className={cn(
                                        "text-xl font-bold cursor-pointer transition-colors",
                                        isAgreed ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    I embrace this custom.
                                </Label>
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
                  Add New Custom Section
                </Button>
              </div>
            )}
          </div>
          
          {!isEditing && allEmbraced && !hasCompletedRequirement && userLevel === 2 && (
            <div className="mt-24 p-8 bg-primary/10 rounded-2xl border-2 border-primary/20 text-center max-w-3xl mx-auto space-y-6">
                <h3 className="text-2xl font-bold">You Have Embraced the Customs</h3>
                <p className="text-muted-foreground">
                    Congratulations. You have acknowledged and agreed to all Trading Tribe Customs. Click the button below to complete this requirement and proceed to Explorer registration.
                </p>
                <Button size="lg" onClick={handleCompleteEmbrace} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    I Have Embraced the Customs
                </Button>
            </div>
          )}
          
          {!isEditing && hasCompletedRequirement && (
             <div className="mt-24 text-center">
                <Button asChild variant="secondary" size="lg">
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Requirement Complete - Return to Path
                    </Link>
                </Button>
             </div>
          )}
        </div>
      </section>

      <footer className="bg-background py-16 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div>
            <div className="font-bold text-2xl tracking-tight mb-2">Trading Tribe</div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trading Tribe Customs</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RelationshipsPage;
