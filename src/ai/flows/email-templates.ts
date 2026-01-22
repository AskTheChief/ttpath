
'use server';

import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { 
    GetEmailTemplatesOutputSchema,
    SaveEmailTemplateInputSchema,
    SaveEmailTemplateOutputSchema,
    type SaveEmailTemplateInput,
    type GetEmailTemplatesOutput,
} from '@/lib/types';
import { emailTemplates as defaultTemplates } from '@/lib/email-templates';

if (!getApps().length) {
  initializeApp({
    projectId: 'studio-7790315517-f3fe6',
  });
}
const db = getFirestore();
const templatesCollection = db.collection('email_templates');

async function seedDefaultTemplates() {
    const batch = db.batch();

    // Always overwrite default templates to ensure they are up-to-date with the code.
    // This allows developers to modify default templates in the codebase and have
    // those changes reflected in the application without manual database changes.
    for (const template of defaultTemplates) {
        const docRef = templatesCollection.doc(template.id);
        batch.set(docRef, template);
    }
    
    if (defaultTemplates.length > 0) {
        console.log(`Syncing ${defaultTemplates.length} default email template(s)...`);
        await batch.commit();
        console.log('Default templates synced successfully.');
    }
}


const getEmailTemplatesFlow = ai.defineFlow(
  {
    name: 'getEmailTemplatesFlow',
    outputSchema: GetEmailTemplatesOutputSchema,
  },
  async () => {
    await seedDefaultTemplates();
    const snapshot = await templatesCollection.orderBy('name').get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as GetEmailTemplatesOutput;
  }
);
export async function getEmailTemplates(): Promise<GetEmailTemplatesOutput> {
    return getEmailTemplatesFlow();
}


const saveEmailTemplateFlow = ai.defineFlow(
  {
    name: 'saveEmailTemplateFlow',
    inputSchema: SaveEmailTemplateInputSchema,
    outputSchema: SaveEmailTemplateOutputSchema,
  },
  async ({ name, subject, body }) => {
    try {
        // Creates a new doc with a unique ID for custom templates
        const docRef = templatesCollection.doc(); 
        await docRef.set({ name, subject, body });
        return { success: true, templateId: docRef.id, message: 'Template saved successfully.' };
    } catch (error: any) {
        console.error('Error saving email template:', error);
        return { success: false, message: error.message || 'Failed to save template.'};
    }
  }
);
export async function saveEmailTemplate(input: SaveEmailTemplateInput): Promise<SaveEmailTemplateOutput> {
    return saveEmailTemplateFlow(input);
}
