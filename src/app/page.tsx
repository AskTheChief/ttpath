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
            TribeQuest is an application designed to guide you through the levels of the Trading Tribe, a community focused on self-improvement and trading psychology. Our app visually represents your progress, allows you to complete tasks to advance, and provides a clear path toward becoming a mentor.
          </p>
          <p>
            We request user data, such as your email for registration and progress tracking, solely to provide and enhance your personalized journey on the path. Your information helps us save your progress and offer features like tribe membership. We are committed to protecting your privacy, and your data will not be shared with third parties.
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
