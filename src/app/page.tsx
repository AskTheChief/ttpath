import PathJourney from '@/components/path-journey';
import { Toaster } from '@/components/ui/toaster';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="mb-8 max-w-4xl text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome to TribeQuest</CardTitle>
          <CardDescription className="text-lg">
            Your journey of personal growth and discovery starts here.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p className="mb-4">
          TribeQuest provides a structured path for personal growth, guiding you through the principles of the Trading Tribe. Our focus is on helping you discover how your feelings and experiences shape your results. Through a series of levels, you'll engage with core concepts, take on challenges, and demonstrate your understanding to advance. This journey is designed to support you in joining or even leading a Tribe.
          </p>
          <p>
            To facilitate your journey, we request user data like your email for registration and to save your progress. This allows us to create a personalized experience and manage your advancement through the levels and your participation in Tribes. We are committed to protecting your privacy, and your data will not be shared with third parties.
          </p>
        </CardContent>
      </Card>
      <h2 className="journey-title">Trading Tribe Path</h2>
      <div className="w-full max-w-7xl">
        <PathJourney />
      </div>
      <Toaster />
    </main>
  );
}
