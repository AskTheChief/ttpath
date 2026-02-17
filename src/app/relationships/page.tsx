
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  Quote,
  Activity,
  Zap,
  CheckCircle2,
  Edit,
  Loader2,
  Trash2,
  PlusCircle,
  ArrowLeft
} from 'lucide-react';
import { getPrinciples, updatePrinciples, type Principle } from '@/ai/flows/relationships-principles';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const RelationshipsPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrinciples, setEditedPrinciples] = useState<Principle[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userLevel, setUserLevel] = useState(0);
  const { toast } = useToast();
  
  const isMentor = userLevel >= 6;

  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const content = await getPrinciples();
      setPrinciples(content);
      setEditedPrinciples(JSON.parse(JSON.stringify(content))); // Deep copy for editing
    } catch (error) {
      console.error("Failed to fetch principles", error);
      toast({ title: "Error loading content", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
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
    });
    return () => unsubscribe();
  }, []);

  const handleEditChange = (index: number, field: keyof Principle, value: string) => {
    const newPrinciples = [...editedPrinciples];
    newPrinciples[index] = { ...newPrinciples[index], [field]: value };
    setEditedPrinciples(newPrinciples);
  };

  const handleAddNewPrinciple = () => {
    const newPrinciple: Principle = {
      title: "New Principle",
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
            <span>TRADING TRIBE<span className="font-light text-muted-foreground ml-2">RELATIONSHIP</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-6">
                <a href="#principles" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">Principles</a>
                <a href="#the-work" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">The Work</a>
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
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Page
            </Button>
          )}
        </div>
      )}

      <header className="pt-40 pb-24 px-4 sm:px-6 lg:px-8 text-center bg-secondary/50">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">
            Trading Tribe<br />Relationship<br />Principles
          </h1>
        </div>
      </header>

      <section id="principles" className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {(isEditing ? editedPrinciples : principles).map((p, i) => (
              <div 
                key={i} 
                className="grid md:grid-cols-2 items-center gap-12 md:gap-16 py-8 group"
              >
                <div className="flex items-center justify-center p-4">
                  <div className="w-full">
                    {p.img && (
                      <img 
                        src={p.img} 
                        alt={p.title} 
                        className="w-full h-auto max-h-[600px] object-contain transition-transform duration-1000 group-hover:scale-105"
                      />
                    )}
                     {isEditing && <Input placeholder="Image Path" value={p.img} onChange={(e) => handleEditChange(i, 'img', e.target.value)} className="mt-4" />}
                  </div>
                </div>
                
                <div className="space-y-4">
                   {isEditing ? (
                     <div className="space-y-4">
                        <Input value={p.title} onChange={(e) => handleEditChange(i, 'title', e.target.value)} className="text-3xl font-bold h-auto p-2 border-2 border-dashed" />
                        <Textarea value={p.content} onChange={(e) => handleEditChange(i, 'content', e.target.value)} className="text-lg text-muted-foreground h-48 p-2 border-2 border-dashed" />
                        <Button variant="destructive" size="sm" onClick={() => handleRemovePrinciple(i)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Section
                        </Button>
                     </div>
                   ) : (
                     <>
                      <h3 className="text-3xl font-bold tracking-tight">{p.title}</h3>
                      <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                        {p.content}
                      </p>
                    </>
                   )}
                </div>
              </div>
            ))}
             {isEditing && (
              <div className="text-center pt-16">
                <Button size="lg" onClick={handleAddNewPrinciple}>
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Add New Section
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="the-work" className="py-24 md:py-32 bg-secondary/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-40 opacity-5 text-muted-foreground pointer-events-none">
          <Heart size={800} fill="currentColor" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 items-center gap-16">
            <div className="flex items-center justify-center p-8 bg-background rounded-2xl shadow-xl">
              <img 
                src="/relationships/relationships_pics/support.jpg"
                alt="The Work of Love Diagram" 
                className="w-full h-auto max-h-[500px] object-contain"
              />
            </div>

            <div className="space-y-8">
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full">The Reward System</div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">The Work of Love</h2>
              
              <div className="space-y-8">
                <Quote className="text-primary opacity-70" size={48} />
                <p className="text-xl md:text-2xl text-muted-foreground">
                  Loving means doing all the stuff above. This can take a lot of work.
                </p>
                
                <div className="space-y-6">
                  <p className="text-lg text-muted-foreground">
                    When we actually do the work of love, we get big rewards: things work smoothly and we experience a warm-fuzzy loving feeling.
                  </p>
                  <p className="text-xl md:text-2xl font-semibold border-l-4 border-primary pl-6">
                    The loving feeling comes from doing the work of love.
                  </p>
                </div>

                <div className="pt-8 border-t">
                  <p className="text-muted-foreground mb-6">
                    If we try to get the warm-fuzzy feeling of love without doing the work of love, we may wind up with conflict and a cold, empty feeling.
                  </p>
                  <div className="p-6 bg-muted/50 rounded-lg border border-border">
                    <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground"></span>
                      Warning: Entrainment Logic
                    </p>
                    <p className="text-muted-foreground">
                      This can entrain manipulation, control, guilt, bullying, frustration, exhaustion, depression, making others responsible for our feelings, writing country songs, etc.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-background py-16 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div>
            <div className="font-bold text-2xl tracking-tight mb-2">Trading Tribe</div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Relationship Principles</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RelationshipsPage;
