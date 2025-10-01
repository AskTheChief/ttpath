
'use server';

import { getTutorialAnswers as getTutorialAnswersFlow } from "@/ai/flows/get-tutorial-answers";
import { auth } from "./firebase";

export async function getTutorialAnswers() {
    const user = auth.currentUser;
    if (!user) {
        return {};
    }
    const idToken = await user.getIdToken();
    return getTutorialAnswersFlow({ idToken });
}
