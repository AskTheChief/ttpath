
'use server';

/**
 * @fileOverview A Genkit flow for creating a new Tribe application.
 *
 * - createTribe - A function that allows an authenticated user to apply to create a new Tribe.
 */

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { CreateTribeInputSchema, CreateTribeOutputSchema, type CreateTribeInput, type CreateTribeOutput } from '@/lib/types';
import Mailgun from 'mailgun.js';
import formData from 'form-data';


// Initialize Firebase Admin SDK if it hasn't been already.
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();


async function sendNewChiefApplicationEmailToMentors(applicantName: string, tribeName: string) {
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    if (!mailgunApiKey || !mailgunDomain) {
        console.error('Mailgun environment variables not set. Skipping email notification.');
        return;
    }

    try {
        const mentorsSnapshot = await db.collection('users').where('currentUserLevel', '==', 6).get();
        if (mentorsSnapshot.empty) {
            console.log('No mentors found to notify.');
            return;
        }

        const mentorEmails = mentorsSnapshot.docs
            .map(doc => doc.data().email)
            .filter(email => !!email);
        
        if (mentorEmails.length === 0) {
            console.log('No mentors with emails found.');
            return;
        }

        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({ username: 'api', key: mailgunApiKey });

        const messageData = {
            from: `TTpath Notifier <info@${mailgunDomain}>`,
            to: mentorEmails,
            subject: `New Tribe Application: "${tribeName}"`,
            text: `Hello Mentors,\n\nA new application has been submitted by ${applicantName} to create the tribe "${tribeName}".\n\nPlease log in to your account to review the application.\n\n- The TTpath Team`,
        };

        await mg.messages.create(mailgunDomain, messageData);
        console.log(`New chief application email sent to ${mentorEmails.length} mentor(s).`);

    } catch (error) {
        console.error('Error sending new chief application email to mentors:', error);
        // Do not throw, as the main flow should still succeed.
    }
}


const createTribeFlow = ai.defineFlow(
  {
    name: 'createTribeFlow',
    inputSchema: CreateTribeInputSchema,
    outputSchema: CreateTribeOutputSchema,
  },
  async (input) => {
    if (!input.idToken) {
        throw new Error('Authentication token is missing.');
    }

    let decodedToken;
    let applicantDoc;
    try {
        decodedToken = await adminAuth.verifyIdToken(input.idToken);
        applicantDoc = await db.collection('users').doc(decodedToken.uid).get();
    } catch (error) {
        console.error('Error verifying ID token or fetching user:', error);
        throw new Error('User not authenticated or profile not found.');
    }
    
    const user = { uid: decodedToken.uid };
    const applicantName = applicantDoc.exists ? `${applicantDoc.data()?.firstName || 'Unknown'} ${applicantDoc.data()?.lastName || ''}`.trim() : 'A new applicant';
    
    try {
      const { name, location, lat, lng } = input;

      if (lat === undefined || lng === undefined) {
        throw new Error('Could not determine coordinates for the provided location.');
      }
      
      const userTutorialDoc = await db.collection('user_tutorials').doc(user.uid).get();
      const answers = userTutorialDoc.exists ? userTutorialDoc.data()?.answers || {} : {};

      // Create an application instead of a tribe directly
      const applicationRef = db.collection('tribe_applications').doc();
      await applicationRef.set({
        type: 'new_tribe',
        tribeName: name,
        location: location,
        lat: lat,
        lng: lng,
        applicantId: user.uid,
        answers: answers,
        status: 'pending',
        createdAt: Timestamp.now(),
      });

      // Send email notification to mentors
      await sendNewChiefApplicationEmailToMentors(applicantName, name);

      // Return a successful response.
      return { success: true, message: "Your application to create a tribe has been submitted for review by a mentor." };
    } catch (error) {
      console.error('Error creating tribe application in Firestore:', error);
      // Return a failure response.
      return { success: false, message: 'An unexpected error occurred while submitting your application.' };
    }
  }
);


export async function createTribe(input: CreateTribeInput): Promise<CreateTribeOutput> {
    return createTribeFlow(input);
}
