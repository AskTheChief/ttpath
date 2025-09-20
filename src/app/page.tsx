import PathJourney from '@/components/path-journey';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-7xl">
        <PathJourney />
      </div>
      <Toaster />
    </main>
  );
}
