
'use server';

import { getTutorialAnswers as getTutorialAnswersFlow } from "@/ai/flows/get-tutorial-answers";

// This function is now just a re-export of the flow.
// The client will call this directly with the idToken.
export const getTutorialAnswers = getTutorialAnswersFlow;
