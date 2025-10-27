
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const NormalizePhoneNumbersOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  processedCount: z.number(),
  updatedCount: z.number(),
});
export type NormalizePhoneNumbersOutput = z.infer<typeof NormalizePhoneNumbersOutputSchema>;

export async function normalizePhoneNumbers(): Promise<NormalizePhoneNumbersOutput> {
  return normalizePhoneNumbersFlow();
}

const normalizePhoneNumbersFlow = ai.defineFlow(
  {
    name: 'normalizePhoneNumbersFlow',
    outputSchema: NormalizePhoneNumbersOutputSchema,
  },
  async () => {
    try {
      const usersSnapshot = await db.collection('users').get();
      let processedCount = 0;
      let updatedCount = 0;
      
      const batch = db.batch();

      usersSnapshot.forEach(doc => {
        processedCount++;
        const data = doc.data();
        const originalPhone = data.phone;

        if (typeof originalPhone === 'string' && originalPhone.length > 0) {
          // First, strip non-digits, but keep a leading '+'
          let cleanedPhone = originalPhone.replace(/[^\d+]/g, (char, index) => {
            if (char === '+' && index === 0) {
              return '+';
            }
            return /\d/.test(char) ? char : '';
          }).replace(/(?!^)\+/g, '');
          
          let normalizedPhone = cleanedPhone;

          // If it doesn't start with '+', it might need '+1'
          if (!cleanedPhone.startsWith('+')) {
            const digitsOnly = cleanedPhone.replace(/\D/g, '');
            if (digitsOnly.length === 10) {
              // Assumes a 10-digit number is a US number, prepend +1
              normalizedPhone = `+1${digitsOnly}`;
            } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
              // Assumes an 11-digit number starting with 1 is a US number
              normalizedPhone = `+${digitsOnly}`;
            }
          }
          
          if (normalizedPhone !== originalPhone) {
            batch.update(doc.ref, { phone: normalizedPhone });
            updatedCount++;
          }
        }
      });
      
      await batch.commit();

      return { 
        success: true, 
        message: `Processed ${processedCount} users and updated ${updatedCount} phone numbers.`,
        processedCount,
        updatedCount,
      };

    } catch (error: any) {
      console.error('Error normalizing phone numbers:', error);
      return { 
        success: false, 
        message: `An unexpected error occurred: ${error.message}`,
        processedCount: 0,
        updatedCount: 0,
       };
    }
  }
);
