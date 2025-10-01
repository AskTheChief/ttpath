
'use server';

import { getTutorialAnswers as getTutorialAnswersFlow, GetTutorialAnswersInput } from "@/ai/flows/get-tutorial-answers";

export async function getTutorialAnswers(input: GetTutorialAnswersInput) {
    return getTutorialAnswersFlow(input);
}
