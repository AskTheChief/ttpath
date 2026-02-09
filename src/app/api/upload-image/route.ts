
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const BUCKET_NAME = 'studio-7790315517-f3fe6.appspot.com';

// Initialize Firebase Admin SDK, ensuring the storage bucket is specified.
if (!getApps().length) {
  console.log('Initializing Firebase Admin SDK...');
  initializeApp({
    credential: applicationDefault(),
    storageBucket: BUCKET_NAME,
  });
  console.log('Firebase Admin SDK initialized.');
}

export async function POST(req: NextRequest) {
  console.log('---[/api/upload-image] Received POST request---');
  try {
    console.log('Authenticating user...');
    const adminAuth = getAuth();
    const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authToken) {
      console.error('API Error: Unauthorized: Missing token.');
      return NextResponse.json({ error: 'Unauthorized: Missing token.' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authToken);
      console.log(`Token verified for UID: ${decodedToken.uid}`);
    } catch (error) {
      console.error('API Error: Error verifying token', error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }

    console.log('Parsing form data...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      console.error('API Error: No file provided.');
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    console.log(`File found: ${file.name}, size: ${file.size}, type: ${file.type}`);

    console.log('Connecting to Firebase Storage...');
    // Explicitly specify the bucket name to avoid any ambiguity.
    const bucket = getStorage().bucket(BUCKET_NAME);
    console.log(`Connected to bucket: ${bucket.name}`);
    
    const userId = decodedToken.uid;
    const fileName = `faq_images/${userId}/${Date.now()}_${file.name}`;
    console.log(`Attempting to upload: ${fileName}`);

    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: file.type,
        },
        resumable: false,
    });
    
    console.log('Reading file into buffer...');
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('File buffer created. Starting upload stream...');

    await new Promise<void>((resolve, reject) => {
        blobStream.on('error', (err) => {
            console.error('STREAM ERROR: Error during GCS upload:', err);
            reject(new Error(`Failed to upload file to storage. GCS Error: ${err.message}`));
        });
        blobStream.on('finish', () => {
            console.log('STREAM FINISH: Upload stream finished successfully.');
            resolve();
        });
        blobStream.end(buffer);
    });

    console.log('File upload promise resolved. Making file public...');
    await blob.makePublic();
    const publicUrl = blob.publicUrl();
    console.log(`File is now public. URL: ${publicUrl}`);
    
    return NextResponse.json({ imageUrl: publicUrl }, { status: 200 });

  } catch (error: any) {
    console.error('---[/api/upload-image] OVERALL CATCH BLOCK ---');
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    const message = error.message || 'An unexpected error occurred processing the request.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
