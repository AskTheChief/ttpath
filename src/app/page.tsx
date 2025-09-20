import PathJourney from '@/components/path-journey';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="journey-title">The Path</h2>
      <div className="w-full max-w-7xl">
        <PathJourney />
      </div>
      <Toaster />
    </main>
  );
}
