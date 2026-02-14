
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { 
    GetPrinciplesOutputSchema,
    UpdatePrinciplesInputSchema, 
    UpdatePrinciplesOutputSchema,
    type GetPrinciplesOutput,
    type UpdatePrinciplesInput,
    type UpdatePrinciplesOutput,
    type Principle
} from '@/lib/types';
import { z } from 'zod';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();
const ADMIN_LEVEL = 6;

const defaultPrinciples: Principle[] = [
    { 
      title: "Service", 
      content: "We have a common purpose: namely, serving others.", 
      img: "/relationsips/relationships pics/service.jpg"
    },
    { 
      title: "Reality / Truth", 
      content: "We hold that reality and truth ultimately rest on subjective opinions and feelings.\n\nAccordingly, we do not argue about facts or right and wrong.\n\nInstead, we share our opinons with each other and receive them as gifts.", 
      img: "/relationsips/relationships pics/reality-truth.png"
    },
    { 
      title: "Listening", 
      content: "We listen to each other actively and with gratitude. We receive, consider and acknowledge our partner's messages as gifts before we proceed to express our own.\n\nWe respect our partner's willingness to receive.\n\nWe stay in communication until we both feel complete.", 
      img: "/relationsips/relationships pics/listening.jpg"
    },
    { 
      title: "Owning Feelings", 
      content: "We own our feelings and take responsibility for them; we do not blame our feelings on each other.\n\nWe do not guess what the other person feels; we do not tell the other person what they feel; we simply ask how the other person feels - and then we listen.", 
      img: "/relationsips/relationships pics/owning-feelings.jpg"
    },
    { 
      title: "Now", 
      content: "We keep our concerns and language in the now.", 
      img: "/relationsips/relationships pics/now.jpg"
    },
    { 
      title: "Support", 
      content: "We support each other in our interests and activities.", 
      img: "/relationsips/relationships pics/support.jpg"
    },
    { 
      title: "Asking Positively", 
      content: "We state what we desire, positively and optimistically, without complaining, criticizing, nagging or belittling.", 
      img: "/relationsips/relationships pics/asking-positively.jpg"
    },
    { 
      title: "Stop Judging Feelings", 
      content: "When our partner feels angry (or any other feeling), we do not judge their feeling or tell them not to feel it.\n\nWe thank them for sharing their feeling and encourage them to share more.", 
      img: "/relationsips/relationships pics/stop-judging-feeling.jpg"
    },
    { 
      title: "Music", 
      content: "We like to sing and dance and play instruments.", 
      img: "/relationsips/relationships pics/music.jpg"
    },
    { 
      title: "System Thinking", 
      content: "We view our relationship holistically and imagine methods to improve it.\n\nWe avoid using causal models that can lead to blame.", 
      img: "/relationsips/relationships pics/System-Thinking.jpg"
    },
    { 
      title: "Questions", 
      content: "We invite our partner to share his feelings, rather than demand he invent logical answers.\n\nWe expecially avoid using \"why\" questions as they invite causal thinking and fighting.", 
      img: "/relationsips/relationships pics/questions.jpg"
    },
    { 
      title: "Intimacy", 
      content: "We celebrate our affection and physical desire for each other naturally, joyfully and frequently.\n\nWe accept, encourge and explore each others' preferences and fantasies.", 
      img: "/relationsips/relationships pics/intimacy.jpg"
    },
    { 
      title: "Adult-to-Adult", 
      content: "We have our childhood communication patterns and issues behind us. We relate as adults.", 
      img: "/relationsips/relationships pics/adult-to-adult.jpg"
    },
    { 
      title: "Outdoors", 
      content: "We enjoy the great outdoors and we like to watch things grow. We like to hike together, especially in forests and at the beach.", 
      img: "/relationsips/relationships pics/outdoors.jpg"
    },
    { 
      title: "Entertaining", 
      content: "We invite friends and associates to our home and enjoy deepening our connections.", 
      img: "/relationsips/relationships pics/entertainment.jpg"
    },
    { 
      title: "Family", 
      content: "We stay in touch with our families and support each other.", 
      img: "/relationsips/relationships pics/family.jpg"
    },
    { 
      title: "Reliability", 
      content: "We clarify agreements before we make them. After we make them, we keep them or modify them by mutual consent.", 
      img: "/relationsips/relationships pics/reliability.jpg"
    },
    { 
      title: "Health", 
      content: "We observe healthy practices in our diets, hygiene, exercise, sleeping and stress management.", 
      img: "/relationsips/relationships pics/Health.jpg"
    },
    { 
      title: "Kindness", 
      content: "We practice kindness and compassion as an art form.", 
      img: "/relationsips/relationships pics/kindness.jpg"
    },
    { 
      title: "Imagination", 
      content: "We support each other in our imagining.\n\nWhen we get stuck in a rut, we imagine something larger and move on to it.", 
      img: "/relationsips/relationships pics/imagination.jpg"
    }
];

const contentRef = db.collection('content').doc('relationships');

const getPrinciplesFlow = ai.defineFlow(
  {
    name: 'getPrinciplesFlow',
    outputSchema: GetPrinciplesOutputSchema,
  },
  async () => {
    const docSnap = await contentRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      if (data && Array.isArray(data.principles)) {
        
        let principlesFromDb = data.principles as Principle[];
        let needsUpdate = false;

        const defaultTitles = new Set(defaultPrinciples.map(p => p.title));

        // 1. Filter out principles that are no longer in the default list (e.g. 'The Swarm')
        const filteredPrinciples = principlesFromDb.filter(p => defaultTitles.has(p.title));
        if (filteredPrinciples.length !== principlesFromDb.length) {
          needsUpdate = true;
        }

        // 2. Update imgbb.co URLs to local paths
        const updatedPrinciples = filteredPrinciples.map(p => {
          if (p.img && p.img.includes('i.ibb.co')) {
            const defaultPrinciple = defaultPrinciples.find(dp => dp.title === p.title);
            if (defaultPrinciple && defaultPrinciple.img !== p.img) {
              needsUpdate = true;
              return { ...p, img: defaultPrinciple.img };
            }
          }
          return p;
        });

        if (needsUpdate) {
          await contentRef.set({ principles: updatedPrinciples });
        }
        
        const finalPrinciples = GetPrinciplesOutputSchema.parse(updatedPrinciples);
        return finalPrinciples;
      }
    }

    // If doc doesn't exist or is malformed, seed with default and return
    await contentRef.set({ principles: defaultPrinciples });
    return defaultPrinciples;
  }
);


export async function getPrinciples(): Promise<GetPrinciplesOutput> {
  return getPrinciplesFlow();
}


const updatePrinciplesFlow = ai.defineFlow(
  {
    name: 'updatePrinciplesFlow',
    inputSchema: UpdatePrinciplesInputSchema,
    outputSchema: UpdatePrinciplesOutputSchema,
  },
  async ({ idToken, principles }) => {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (!userDoc.exists || (userDoc.data()?.currentUserLevel || 0) < ADMIN_LEVEL) {
        throw new Error('Permission denied. User is not a mentor.');
      }
      
      await contentRef.set({ principles });
      return { success: true, message: "Content updated successfully." };

    } catch (error: any) {
      console.error("Error updating relationship principles:", error);
      return { success: false, message: error.message || "An unexpected error occurred." };
    }
  }
);

export async function updatePrinciples(input: UpdatePrinciplesInput): Promise<UpdatePrinciplesOutput> {
    return updatePrinciplesFlow(input);
}
