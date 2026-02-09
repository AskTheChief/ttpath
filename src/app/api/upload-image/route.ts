
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// This function ensures firebase-admin is initialized only once.
function getFirebaseAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }
    
    // Explicitly define the storage bucket on initialization
    // This is more robust in some cloud environments.
    return initializeApp({
        storageBucket: "studio-7790315517-f3fe6.appspot.com",
    });
}

export async function POST(req: NextRequest) {
  try {
    const app = getFirebaseAdminApp();
    const adminAuth = getAuth(app);
    // Get the default bucket that was configured during initialization
    const bucket = getStorage(app).bucket();

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

    // Use a separate try/catch for the upload stream itself for clearer error handling
    try {
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

    } catch (uploadError: any) {
        console.error('File Upload Process Error:', uploadError);
        return NextResponse.json({ error: uploadError.message || 'File upload process failed.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Overall API Error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred processing the request.' }, { status: 500 });
  }
}
