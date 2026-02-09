
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, applicationDefault, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// This is the bucket name provided by the user.
const BUCKET_NAME = 'studio-7790315517-f3fe6';

// Ensure Firebase is initialized only once.
if (!getApps().length) {
  try {
    initializeApp({
      credential: applicationDefault(),
      // Explicitly provide the storageBucket using the user-provided name.
      storageBucket: BUCKET_NAME,
    });
    console.log('---[/api/upload-image] Firebase Admin SDK initialized successfully.');
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

    // Explicitly get the bucket by name to ensure we are targeting the correct one.
    const bucket = getStorage().bucket(BUCKET_NAME);
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

    await blob.makePublic();
    const publicUrl = blob.publicUrl();
    console.log(`---[/api/upload-image] File is public. URL: ${publicUrl}`);
    
    return NextResponse.json({ imageUrl: publicUrl }, { status: 200 });

  } catch (error: any) {
    console.error(`---[/api/upload-image] CATCH BLOCK ERROR: ${error.message}`);
    const message = error.message || 'An unexpected error occurred processing the request.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
