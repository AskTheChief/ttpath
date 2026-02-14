'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Heart, 
  Quote,
  Activity,
  Zap,
  CheckCircle2,
  Edit,
  Loader2
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
    <div className="min-h-screen bg-white text-[#1a1a1a] font-sans selection:bg-blue-100 pb-20">
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-gray-100 py-4' : 'bg-transparent py-8'}`}>
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <div className="flex items-center gap-3 font-black tracking-tighter text-2xl">
            <Activity className="text-blue-600" size={28} />
            <span>TRADING TRIBE<span className="font-light text-gray-400 ml-2">RELATIONSHIP</span></span>
          </div>
          <div className="hidden md:flex gap-10">
            <a href="#principles" className="text-xs font-black hover:text-blue-600 transition-colors uppercase tracking-widest">Principles</a>
            <a href="#the-work" className="text-xs font-black hover:text-blue-600 transition-colors uppercase tracking-widest">The Work</a>
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

      <header className="pt-48 pb-20 px-8 text-center bg-gray-50/50">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] mb-10">
            <Zap size={14} fill="currentColor" /> February 13, 2026
          </div>
          <h1 className="text-7xl md:text-[10rem] font-black mb-10 leading-[0.85] tracking-tighter text-gray-900 text-center">
            Relationship <br/><span className="text-blue-600 italic font-medium">Principles.</span>
          </h1>
          <p className="text-2xl md:text-3xl text-gray-400 font-light max-w-3xl mx-auto leading-relaxed italic">
            "A guide for serving others through intimacy-centric swarm intelligence."
          </p>
        </div>
      </header>

      <section className="py-24 px-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-20">
            <div className="md:w-1/2 flex justify-center">
              <img 
                src="https://i.ibb.co/JR1wGZQZ/embrace.jpg" 
                alt="Embrace Diagram" 
                className="w-full h-auto max-h-[500px] object-contain rounded-3xl shadow-sm"
              />
            </div>
            <div className="md:w-1/2 space-y-10">
              <h2 className="text-5xl md:text-8xl font-black italic tracking-tighter text-blue-600">Embrace</h2>
              <div className="space-y-8">
                <p className="text-2xl md:text-4xl font-light text-gray-500 leading-tight">
                  Embrace: to accept with willingness and enthusiasm.
                </p>
                <div className="pt-10 border-t border-gray-100">
                  <p className="text-2xl md:text-5xl font-black flex items-center gap-6 text-gray-900 leading-none">
                    <CheckCircle2 size={48} className="text-blue-600 flex-shrink-0" />
                    I embrace these principles.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="principles" className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <div className="space-y-20">
            {(isEditing ? editedPrinciples : principles).map((p, i) => (
              <div 
                key={i} 
                className="flex flex-col md:flex-row items-center gap-16 md:gap-24 py-16 border-b border-gray-50 last:border-0 group"
              >
                <div className="md:w-1/2 flex items-center justify-center p-4">
                  <div className="w-full">
                    <img 
                      src={p.img} 
                      alt={p.title} 
                      className="w-full h-auto max-h-[600px] object-contain transition-transform duration-1000 group-hover:scale-105"
                    />
                     {isEditing && <Input value={p.img} onChange={(e) => handleEditChange(i, 'img', e.target.value)} className="mt-4" />}
                  </div>
                </div>
                
                <div className="md:w-1/2 space-y-8">
                   {isEditing ? (
                     <div className="space-y-4">
                        <Input value={p.title} onChange={(e) => handleEditChange(i, 'title', e.target.value)} className="text-4xl md:text-7xl font-black tracking-tighter leading-none h-auto p-2 border-2 border-dashed" />
                        <Textarea value={p.content} onChange={(e) => handleEditChange(i, 'content', e.target.value)} className="text-xl md:text-3xl text-gray-400 leading-relaxed font-medium h-64 p-2 border-2 border-dashed" />
                     </div>
                   ) : (
                     <>
                      <h3 className="text-4xl md:text-7xl font-black tracking-tighter text-gray-900 leading-none">{p.title}</h3>
                      <p className="text-xl md:text-3xl text-gray-400 leading-relaxed font-medium whitespace-pre-line">
                        {p.content}
                      </p>
                    </>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="the-work" className="py-32 bg-[#121212] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-40 opacity-[0.02] pointer-events-none">
          <Heart size={800} fill="currentColor" />
        </div>
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-24">
            <div className="lg:w-1/2 flex items-center justify-center p-8 bg-white rounded-[4rem] shadow-2xl">
              <img 
                src="https://i.ibb.co/ynKP9vgm/the-work-of-love.jpg" 
                alt="The Work of Love Diagram" 
                className="w-full h-auto max-h-[600px] object-contain"
              />
            </div>

            <div className="lg:w-1/2 space-y-12">
              <div className="inline-block px-4 py-1 bg-blue-600 text-[10px] font-black uppercase tracking-widest rounded">The Reward System</div>
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-4 uppercase">The Work of <span className="text-blue-500 italic font-medium">Love.</span></h2>
              
              <div className="space-y-10">
                <Quote className="text-blue-600 opacity-50" size={64} />
                <p className="text-2xl md:text-4xl italic font-serif leading-tight text-gray-300">
                  Loving means doing all the stuff above. This can take a lot of work.
                </p>
                
                <div className="space-y-8">
                  <div className="space-y-6">
                    <p className="text-xl md:text-2xl text-gray-400 leading-relaxed">
                      When we actually do the work of love, we get big rewards: things work smoothly and we a warm-fuzzy loving feeling.
                    </p>
                    <p className="text-2xl md:text-4xl font-black text-white border-l-8 border-blue-600 pl-8 uppercase tracking-tighter leading-none">
                      The loving feeling comes only from doing the work of love.
                    </p>
                  </div>

                  <div className="pt-10 border-t border-white/10">
                    <p className="text-gray-500 text-lg leading-relaxed mb-8">
                      If we try to get the warm-fuzzy feeling of love without doing the work of love, we may wind up with the conflict and a cold, empty feeling instead.
                    </p>
                    <div className="p-10 bg-red-900/10 rounded-[3rem] border border-red-900/30">
                      <p className="text-xs uppercase tracking-[0.4em] font-black text-red-500 mb-6 flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                        Warning: Entrainment Logic
                      </p>
                      <p className="text-xl font-bold text-red-200/60 leading-relaxed italic">
                        This can entrain manipulation, control, guilt, bullying, frustration, exhaustion, depression, making others responsible for our feelings, writing country songs, etc.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white py-24 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-10 text-center md:text-left">
          <div>
            <div className="font-black text-4xl tracking-tighter uppercase mb-4">Trading Tribe</div>
            <p className="text-xs font-black text-gray-300 uppercase tracking-[0.3em]">Relationship Protocols — February 2026</p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-3">
             <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Optimized System Intelligence</div>
             <div className="h-0.5 w-32 bg-blue-600"></div>
             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Seykota relationship Re-Design</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RelationshipsPage;
