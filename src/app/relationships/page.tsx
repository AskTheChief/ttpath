'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Edit, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getRelationshipsContent, updateRelationshipsContent } from '@/ai/flows/relationships-content';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

const ADMIN_LEVEL = 6;

export default function RelationshipsPage() {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userLevel, setUserLevel] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchContent() {
      try {
        const { content: fetchedContent } = await getRelationshipsContent();
        setContent(fetchedContent);
        setOriginalContent(fetchedContent);
      } catch (error) {
        console.error("Failed to fetch relationships content:", error);
        toast({ title: 'Error loading content', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        setUserLevel(userDoc.data()?.currentUserLevel || 0);
      } else {
        setUserLevel(0);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const idToken = await user.getIdToken();
      await updateRelationshipsContent({ idToken, content });
      setOriginalContent(content);
      setIsEditing(false);
      toast({ title: 'Content Saved' });
    } catch (error: any) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const isMentor = userLevel >= ADMIN_LEVEL;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Relationships</h1>
        <div className="flex items-center gap-4">
          {isMentor && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Page
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Path
            </Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>The Tribe and Relationships</CardTitle>
          <CardDescription>Perspectives on relationships within the Trading Tribe context.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : isEditing ? (
            <div className="space-y-4">
              <Textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                className="text-base"
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save
                </Button>
                <Button variant="ghost" onClick={() => { setIsEditing(false); setContent(originalContent); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="prose dark:prose-invert max-w-none text-lg"
              dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
