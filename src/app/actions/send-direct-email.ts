'use server';

import { sendDirectEmail as sendDirectEmailFlow } from '@/ai/flows/send-direct-email';
import type { SendDirectEmailInput, SendDirectEmailOutput } from '@/lib/types';

/**
 * Server Action wrapper for sendDirectEmail.
 * This guarantees Next.js executes the underlying Genkit flow exclusively on the server,
 * preventing 'Mailgun environment variables are not set' errors when called from Client Components.
 */
export async function sendDirectEmailAction(input: SendDirectEmailInput): Promise<SendDirectEmailOutput> {
  return sendDirectEmailFlow(input);
}
