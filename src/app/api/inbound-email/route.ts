import { NextRequest, NextResponse } from 'next/server';
import { saveInboundEmail } from '@/ai/flows/save-inbound-email';

/**
 * Handles inbound emails forwarded by Mailgun.
 * This route receives the email data, parses it, and passes it to a Genkit flow
 * to be saved in the Firestore database.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Convert FormData to a plain object
    const emailData: { [key: string]: string | File } = {};
    formData.forEach((value, key) => {
      emailData[key] = value;
    });

    // The Genkit flow expects a simple Record<string, string>.
    // We'll filter out any file data just in case.
    const serializableData: Record<string, string> = {};
    for (const key in emailData) {
        const value = emailData[key];
        if (typeof value === 'string') {
            serializableData[key] = value;
        }
    }

    // Call the reliable Genkit flow to save the data
    const result = await saveInboundEmail(serializableData);

    if (!result.success) {
      // If the flow reports an error, log it and return a server error
      console.error('Failed to save inbound email via flow:', result.message);
      return NextResponse.json({ error: 'Failed to process email in backend flow.' }, { status: 500 });
    }

    // Acknowledge receipt to Mailgun
    return NextResponse.json({ message: 'Email received and stored.' }, { status: 200 });

  } catch (error: any) {
    console.error('Error handling inbound email POST request:', error);
    // Let Mailgun know there was an error so it can retry if configured to do so.
    return NextResponse.json({ error: 'Failed to process email request.' }, { status: 500 });
  }
}
