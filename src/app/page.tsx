import PathJourney from '@/components/path-journey';
import { Toaster } from '@/components/ui/toaster';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="journey-title">Trading Tribe Path</h2>

      <Accordion type="single" collapsible className="w-full max-w-4xl mb-8">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-center justify-center text-muted-foreground">
            What is this journey?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-sm text-center">
            <p className="mb-4">
              TribeQuest provides a structured path for personal growth, guiding you through the principles of the Trading Tribe. Our focus is on helping you discover how your feelings and experiences shape your results. Through a series of levels, you'll engage with core concepts, take on challenges, and demonstrate your understanding to advance. This journey is designed to support you in joining or even leading a Tribe.
            </p>
            <p>
              To facilitate your journey, we request user data like your email for registration and to save your progress. This allows us to create a personalized experience and manage your advancement through the levels and your participation in Tribes. We are committed to protecting your privacy, and your data will not be shared with third parties.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="w-full max-w-7xl">
        <PathJourney />
      </div>
      <Toaster />
    </main>
  );
}
