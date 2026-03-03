'use client';

/**
 * @fileOverview A Genkit flow for creating a new Tribe application.
 */

import { ai } from '@/ai/genkit';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { CreateTribeInputSchema, CreateTribeOutputSchema, type CreateTribeInput, type CreateTribeOutput } from '@/lib/types';
import Mailgun from 'mailgun.js';
import formData from 'form-data';


if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const adminAuth = getAuth();


async function sendNewChiefApplicationEmailToMentors(applicantName: string, tribeName: string, embracedCustoms: string[]) {
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

        const customsList = embracedCustoms.length > 0 
            ? embracedCustoms.map(c => `• ${c}`).join('\n') 
            : 'None';

        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({ username: 'api', key: mailgunApiKey });

        const messageData = {
            from: `TTpath Notifier <info@${mailgunDomain}>`,
            to: mentorEmails,
            subject: `New Tribe Application: "${tribeName}"`,
            text: `Hello Mentors,\n\nA new application has been submitted by ${applicantName} to create the tribe "${tribeName}".\n\nEmbraced Customs:\n${customsList}\n\nPlease log in to your account to review the application.\n\n- The TTpath Team`,
            html: `
                <div style="font-family: sans-serif; color: #333;">
                    <p>Hello Mentors,</p>
                    <p>A new application has been submitted by <strong>${applicantName}</strong> to create the tribe "<strong>${tribeName}</strong>".</p>
                    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #dcfce7; margin: 20px 0;">
                        <h4 style="margin-top: 0; color: #166534;">Applicant's Embraced Customs:</h4>
                        <p style="margin-bottom: 0;">${embracedCustoms.length > 0 ? embracedCustoms.join(', ') : 'No customs embraced yet.'}</p>
                    </div>
                    <p>Please log in to your account to review the application.</p>
                    <p>- The TTpath Team</p>
                </div>
            `,
        };

        await mg.messages.create(mailgunDomain, messageData);
        console.log(`New chief application email sent to ${mentorEmails.length} mentor(s).`);

    } catch (error) {
        console.error('Error sending new chief application email to mentors:', error);
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
    const applicantData = applicantDoc.data();
    const applicantName = applicantDoc.exists ? `${applicantData?.firstName || 'Unknown'} ${applicantData?.lastName || ''}`.trim() : 'A new applicant';
    const embracedCustoms = applicantData?.embracedCustoms || [];
    
    try {
      const { name, location, lat, lng } = input;

      if (lat === undefined || lng === undefined) {
        throw new Error('Could not determine coordinates for the provided location.');
      }
      
      const userTutorialDoc = await db.collection('user_tutorials').doc(user.uid).get();
      const answers = userTutorialDoc.exists ? userTutorialDoc.data()?.answers || {} : {};

      const applicationRef = db.collection('tribe_applications').doc();
      await applicationRef.set({
        type: 'new_tribe',
        tribeName: name,
        location: location,
        lat: lat,
        lng: lng,
        applicantId: user.uid,
        answers: answers,
        embracedCustoms: embracedCustoms,
        status: 'pending',
        createdAt: Timestamp.now(),
      });

      await sendNewChiefApplicationEmailToMentors(applicantName, name, embracedCustoms);

      return { success: true, message: "Your application to create a tribe has been submitted for review by a mentor." };
    } catch (error) {
      console.error('Error creating tribe application in Firestore:', error);
      return { success: false, message: 'An unexpected error occurred while submitting your application.' };
    }
  }
);


export async function createTribe(input: CreateTribeInput): Promise<CreateTribeOutput> {
    return createTribeFlow(input);
}
