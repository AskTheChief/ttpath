
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Initialize the app cleanly, consistent with other server-side flows.
if (!getApps().length) {
  initializeApp();
}

export async function POST(req: NextRequest) {
  try {
    const adminAuth = getAuth();
    // Explicitly get the bucket by name to ensure the correct one is used.
    const bucket = getStorage().bucket("studio-7790315517-f3fe6.appspot.com");

    const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized: Missing token.' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authToken);
    } catch (error) {
      console.error('Error verifying token', error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    
    const userId = decodedToken.uid;
    const fileName = `faq_images/${userId}/${Date.now()}_${file.name}`;

    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: file.type,
        },
        resumable: false,
    });
    
    const buffer = Buffer.from(await file.arrayBuffer());

    await new Promise<void>((resolve, reject) => {
        blobStream.on('error', (err) => {
            console.error('Stream Error: Error uploading to GCS:', err);
            reject(new Error('Failed to upload file to storage.'));
        });
        blobStream.on('finish', () => {
            resolve();
        });
        blobStream.end(buffer);
    });

    // If the upload promise resolves, make the file public
    await blob.makePublic();
    const publicUrl = blob.publicUrl();
    
    return NextResponse.json({ imageUrl: publicUrl }, { status: 200 });

  } catch (error: any) {
    console.error('Overall API Error:', error);
    // Ensure a proper JSON error response is sent
    const message = error.message || 'An unexpected error occurred processing the request.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
