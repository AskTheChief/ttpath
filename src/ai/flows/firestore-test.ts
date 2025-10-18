
'use server';

/**
 * @fileOverview A Genkit flow for testing Firestore connectivity.
 *
 * - firestoreTest - A function that performs a simple write and read operation in Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

const FirestoreTestOutputSchema = z.object({
  success: z.boolean(),
  logs: z.array(z.string()),
  writtenData: z.any().nullable(),
  readData: z.any().nullable(),
});
export type FirestoreTestResult = z.infer<typeof FirestoreTestOutputSchema>;

const firestoreTestFlow = ai.defineFlow(
  {
    name: 'firestoreTestFlow',
    inputSchema: z.object({}),
    outputSchema: FirestoreTestOutputSchema,
  },
  async () => {
    const logs: string[] = [];
    const testDocId = `test_${Date.now()}`;
    const testCollection = 'dev_den_test';
    const testData = {
      message: 'Hello from Dev Den!',
      timestamp: Timestamp.now(),
    };
    let writtenData: any = null;
    let readData: any = null;

    try {
      logs.push(`Attempting to write to collection '${testCollection}' with doc ID '${testDocId}'.`);
      const docRef = db.collection(testCollection).doc(testDocId);
      await docRef.set(testData);
      writtenData = testData;
      logs.push('Write operation successful.');

      try {
        logs.push(`Attempting to read doc ID '${testDocId}' from collection '${testCollection}'.`);
        const readDoc = await docRef.get();
        if (readDoc.exists) {
          const data = readDoc.data();
          readData = {
            ...data,
            // Convert Firestore Timestamp to a serializable format (ISO string)
            timestamp: data?.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data?.timestamp,
          };
          logs.push('Read operation successful.');
          
          // Basic validation
          if (readData.message === testData.message) {
            logs.push('Data validation successful: Read message matches written message.');
            return { success: true, logs, writtenData: testData, readData };
          } else {
            logs.push('Data validation failed: Read message does not match written message.');
            return { success: false, logs, writtenData: testData, readData };
          }

        } else {
          logs.push('Read operation failed: Document does not exist after write.');
          return { success: false, logs, writtenData: testData, readData: null };
        }
      } catch (readError: any) {
        logs.push(`Read operation failed with error: ${readError.message}`);
        return { success: false, logs, writtenData: testData, readData: null };
      }

    } catch (writeError: any) {
      logs.push(`Write operation failed with error: ${writeError.message}`);
      return { success: false, logs, writtenData: testData, readData: null };
    }
  }
);

export async function firestoreTest(input: {}): Promise<FirestoreTestResult> {
    return firestoreTestFlow(input);
}
