
'use server';

import { getTutorialAnswers as getTutorialAnswersFlow } from "@/ai/flows/get-tutorial-answers";

export async function getTutorialAnswers(input: {}) {
    return getTutorialAnswersFlow(input);
}
