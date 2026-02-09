'use server';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// This function ensures Firebase is initialized only once per instance.
function initializeFirebaseAdmin(): App {
    if (getApps().length > 0) {
        console.log('---[/api/upload-image] Firebase Admin SDK already initialized.');
        return getApps()[0];
    }
    try {
        console.log('---[/api/upload-image] Initializing Firebase Admin SDK with default credentials...');
        // Initialize without arguments to use Application Default Credentials from the environment.
        const app = initializeApp();
        console.log('---[/api/upload-image] Firebase Admin SDK initialized successfully.');
        return app;
    } catch (error: any) {
        console.error('---[/api/upload-image] CRITICAL: Firebase Admin Init Error:', error.message);
        // Re-throw the error to be caught by the POST handler's catch block.
        throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
    }
}


export async function POST(req: NextRequest) {
  try {
    console.log('---[/api/upload-image] POST request received.');
    
    // Lazily initialize Firebase Admin SDK within the request handler.
    initializeFirebaseAdmin();

    const adminAuth = getAuth();
    const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authToken) {
      console.error('---[/api/upload-image] Error: Missing auth token.');
      return NextResponse.json({ error: 'Unauthorized: Missing token.' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authToken);
      console.log(`---[/api/upload-image] Token verified for UID: ${decodedToken.uid}`);
    } catch (error: any) {
      console.error('---[/api/upload-image] API Error: Error verifying token', error.message);
      return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      console.error('---[/api/upload-image] Error: No file provided.');
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    console.log(`---[/api/upload-image] File received: ${file.name}, Size: ${file.size}`);

    // Get the default bucket from the initialized app.
    const bucket = getStorage().bucket();
    console.log(`---[/api/upload-image] Using storage bucket: ${bucket.name}`);
    
    const userId = decodedToken.uid;
    const fileName = `faq_images/${userId}/${Date.now()}_${file.name}`;
    console.log(`---[/api/upload-image] Uploading to path: ${fileName}`);
    
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
            console.error('---[/api/upload-image] STREAM ERROR:', err);
            reject(new Error(`Failed to upload file to storage. GCS Error: ${err.message}`));
        });
        blobStream.on('finish', () => {
            console.log('---[/api/upload-image] Stream finished successfully.');
            resolve();
        });
        blobStream.end(buffer);
    });

    // Make the file public so it can be viewed in the browser
    await blob.makePublic();
    const publicUrl = blob.publicUrl();
    console.log(`---[/api/upload-image] File is public. URL: ${publicUrl}`);
    
    return NextResponse.json({ imageUrl: publicUrl }, { status: 200 });

  } catch (error: any) {
    // This will catch errors from both initialization and the main logic.
    const message = error.message || 'An unexpected error occurred processing the request.';
    console.error(`---[/api/upload-image] CATCH BLOCK ERROR: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
