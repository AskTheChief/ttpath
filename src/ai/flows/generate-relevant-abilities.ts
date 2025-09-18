'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRelevantAbilitiesInputSchema = z.object({
  level: z
    .string()
    .describe("The user's current level in The Trading Tribe (e.g., 'Visitor', 'Guest', 'Candidate')."),
  completedRequirements: z
    .record(z.boolean())
    .describe('A map of completed requirements, e.g. {"read-book": true}'),
});
export type GenerateRelevantAbilitiesInput = z.infer<typeof GenerateRelevantAbilitiesInputSchema>;


const AbilitySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  isCompleted: z.boolean(),
});

const GenerateRelevantAbilitiesOutputSchema = z.object({
  abilities: z.array(AbilitySchema),
  isLevelComplete: z.boolean(),
  nextLevel: z.string().optional(),
  nextPaths: z.array(z.string()).optional(),
});
export type GenerateRelevantAbilitiesOutput = z.infer<typeof GenerateRelevantAbilitiesOutputSchema>;


const allAbilities = {
  Visitor: [
    { id: 'sign-up', title: 'Sign Up', description: 'Create an account to save your progress.' },
  ],
  Guest: [
    { id: 'read-book', title: 'Read the Excerpt', description: 'Read the introductory chapter of the core text.' },
    { id: 'complete-tutorial', title: 'Complete the Tutorial', description: 'Finish the interactive welcome tutorial.' },
  ],
  Candidate: [
    { id: 'read-full-book', title: 'Read the Full Book', description: 'Finish the entire core text to understand the philosophy.' },
    { id: 'chat-chief', title: 'Chat with a Chief', description: 'Have a conversation with an experienced tribe chief.' },
  ],
  Member: [
    { id: 'join-tribe', title: 'Join a Tribe', description: 'Become an active member of an existing tribe.' },
  ],
  Chief: [
    { id: 'start-tribe', title: 'Start a Tribe', description: 'Form and lead your own new tribe.' },
  ],
  Mentor: [
    { id: 'get-badge', title: 'Earn a Mentor Badge', description: 'Achieve the mentor status by guiding others.' },
  ],
};

const generateRelevantAbilitiesFlow = ai.defineFlow(
  {
    name: 'generateRelevantAbilitiesFlow',
    inputSchema: GenerateRelevantAbilitiesInputSchema,
    outputSchema: GenerateRelevantAbilitiesOutputSchema,
  },
  async ({ level, completedRequirements }) => {
    const currentAbilities = allAbilities[level as keyof typeof allAbilities] || [];
    
    const abilities = currentAbilities.map(ability => ({
      ...ability,
      isCompleted: !!completedRequirements[ability.id],
    }));

    const isLevelComplete = abilities.every(ability => ability.isCompleted);
    
    let nextLevel: string | undefined;
    let nextPaths: string[] | undefined;

    if (isLevelComplete) {
      switch (level) {
        case 'Visitor':
          nextLevel = 'Guest';
          break;
        case 'Guest':
          nextLevel = 'Candidate';
          break;
        case 'Candidate':
          nextPaths = ['Member', 'Chief', 'Mentor'];
          break;
        default:
          nextLevel = undefined;
          break;
      }
    }

    return {
      abilities,
      isLevelComplete,
      nextLevel,
      nextPaths,
    };
  }
);

export async function generateRelevantAbilities(input: GenerateRelevantAbilitiesInput): Promise<GenerateRelevantAbilitiesOutput> {
    return generateRelevantAbilitiesFlow(input);
}
