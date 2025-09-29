
'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { createTribe, getTribes, joinTribe, leaveTribe, Tribe } from '@/lib/tribes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function MyTribePage() {
  const [user, setUser] = useState<User | null>(null);
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [newTribeName, setNewTribeName] = useState('');
  const [userTribe, setUserTribe] = useState<Tribe | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchTribes(currentUser.uid);
      } else {
        setTribes([]);
        setUserTribe(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchTribes = async (userId: string) => {
    const allTribes = await getTribes();
    setTribes(allTribes);
    const currentUserTribe = allTribes.find(tribe => tribe.members.includes(userId));
    setUserTribe(currentUserTribe || null);
  };

  const handleCreateTribe = async () => {
    if (newTribeName.trim() === '' || !user) return;
    try {
      const newTribeId = await createTribe(newTribeName, user.uid);
      toast({ title: 'Tribe Created', description: `Successfully created ${newTribeName}.` });
      setNewTribeName('');
      fetchTribes(user.uid);
    } catch (error) {
      console.error("Error creating tribe: ", error);
      toast({ title: 'Error', description: 'Failed to create tribe.', variant: 'destructive' });
    }
  };

  const handleJoinTribe = async (tribeId: string) => {
    if (!user) return;
    try {
      await joinTribe(tribeId, user.uid);
      toast({ title: 'Joined Tribe', description: 'You have successfully joined the tribe.' });
      fetchTribes(user.uid);
    } catch (error) {
      console.error("Error joining tribe: ", error);
      toast({ title: 'Error', description: 'Failed to join tribe.', variant: 'destructive' });
    }
  };

  const handleLeaveTribe = async (tribeId: string) => {
    if (!user) return;
    try {
      await leaveTribe(tribeId, user.uid);
      toast({ title: 'Left Tribe', description: 'You have successfully left the tribe.' });
      fetchTribes(user.uid);
    } catch (error) {
      console.error("Error leaving tribe: ", error);
      toast({ title: 'Error', description: 'Failed to leave tribe.', variant: 'destructive' });
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4">You must be logged in to view your tribe.</p>
        <Link href="/" passHref>
          <Button>Back to Path</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Link href="/" passHref>
        <Button className="absolute top-4 left-4">Back to Path</Button>
      </Link>
      <h1 className="text-3xl font-bold text-center my-8">My Tribe</h1>

      {userTribe ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Current Tribe: {userTribe.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Members: {userTribe.members.length}</p>
            <Button onClick={() => handleLeaveTribe(userTribe.id)} variant="destructive" className="mt-4">Leave Tribe</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create a New Tribe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="text"
                value={newTribeName}
                onChange={(e) => setNewTribeName(e.target.value)}
                placeholder="Enter tribe name"
              />
              <Button onClick={handleCreateTribe}>Create Tribe</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Available Tribes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tribes.map((tribe) => (
              <div key={tribe.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{tribe.name}</h3>
                  <p className="text-sm text-muted-foreground">Members: {tribe.members.length}</p>
                </div>
                {!userTribe && (
                  <Button onClick={() => handleJoinTribe(tribe.id)}>Join</Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
