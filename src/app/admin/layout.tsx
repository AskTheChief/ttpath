
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const ADMIN_LEVEL = 6; // Mentor level

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists() && userDoc.data()?.currentUserLevel >= ADMIN_LEVEL) {
            setIsAuthorized(true);
          } else {
            router.push('/'); // Redirect non-admins to home
          }
        } catch (error) {
          console.error("Authorization check failed:", error);
          router.push('/');
        } finally {
          setLoading(false);
        }
      } else {
        // No user logged in
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Verifying access...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    // This part is mainly a fallback, as the redirect should have already happened.
    return null;
  }

  return <>{children}</>;
}
