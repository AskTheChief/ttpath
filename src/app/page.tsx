
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
              The Trading Tribe Path supports your personal growth. It guides you through the principles of the Trading Tribe. The path helps you discover how your feelings and experiences shape your results. You engage with core concepts and take on challenges to advance. This journey supports you in joining or leading a Tribe. This page supports the growth and maintenance of Tribes as they develop.
            </p>
            <p>
              To facilitate your journey, the system uses your email for registration and to save your progress. This function creates a personalized experience. It also manages your advancement through the levels and your participation in Tribes. We commit to protecting your privacy. We do not share your data with third parties.
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
