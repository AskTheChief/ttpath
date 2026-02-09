'use server';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, applicationDefault, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Ensure Firebase is initialized only once.
if (!getApps().length) {
  try {
    // Initialize with application default credentials. This allows the Admin SDK
    // to automatically detect the project and its default storage bucket.
    initializeApp({
      credential: applicationDefault(),
    });
    console.log('---[/api/upload-image] Firebase Admin SDK initialized successfully with default credentials.');
  } catch (error: any) {
    console.error('---[/api/upload-image] CRITICAL: Firebase Admin Init Error:', error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('---[/api/upload-image] POST request received.');
    
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

    // Get the default bucket associated with the project.
    // By not passing a name, the SDK uses the default bucket. This is the most reliable method.
    const bucket = getStorage().bucket();
    console.log(`---[/api/upload-image] Using default storage bucket: ${bucket.name}`);
    
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
            // This is where the "bucket not specified" error would likely appear if config is wrong.
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
    // This top-level catch will grab any errors not caught by the stream handler.
    console.error(`---[/api/upload-image] CATCH BLOCK ERROR: ${error.message}`);
    const message = error.message || 'An unexpected error occurred processing the request.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
