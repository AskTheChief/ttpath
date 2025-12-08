
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if it hasn't been already.
// By not passing any credentials, the SDK will automatically use the
// service account associated with the App Hosting environment.
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

/**
 * Handles inbound emails forwarded by Mailgun.
 * Mailgun sends a POST request with the email data in the request body.
 * This function parses the data and saves it to the 'inbound_emails' Firestore collection.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const emailData: { [key: string]: any } = {};
    formData.forEach((value, key) => {
      emailData[key] = value;
    });

    // Use the correct Admin SDK Timestamp.now() method.
    emailData.receivedAt = Timestamp.now();
    
    // The 'body-plain' field usually contains the text version of the email.
    // We are storing the whole payload for flexibility.

    await db.collection('inbound_emails').add(emailData);

    return NextResponse.json({ message: 'Email received and stored.' }, { status: 200 });

  } catch (error: any) {
    console.error('Error handling inbound email:', error);
    // Let Mailgun know there was an error so it can retry if configured to do so.
    return NextResponse.json({ error: 'Failed to process email' }, { status: 500 });
  }
}
