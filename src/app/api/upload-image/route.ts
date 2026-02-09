
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// This is the full bucket name for the Admin SDK
const BUCKET_NAME = 'studio-7790315517-f3fe6.appspot.com';

function initializeFirebaseAdmin(): App {
    // Check if the app is already initialized
    if (getApps().length > 0) {
        console.log('---[/api/upload-image] Using existing Firebase Admin SDK instance.');
        return getApps()[0];
    }
    
    console.log('---[/api/upload-image] Initializing new Firebase Admin SDK instance...');
    try {
        // In a managed environment like Cloud Run, Application Default Credentials should be used.
        // We explicitly provide the bucket name to avoid any ambiguity.
        const app = initializeApp({
            storageBucket: BUCKET_NAME,
        });
        console.log('---[/api/upload-image] Firebase Admin SDK initialized successfully.');
        return app;
    } catch (error: any) {
        console.error('---[/api/upload-image] CRITICAL: Firebase Admin SDK initialization failed.', error);
        // We re-throw the error so it can be caught by the main handler and returned as a 500 response.
        throw error;
    }
}

export async function POST(req: NextRequest) {
  console.log('---[/api/upload-image] Received POST request.');
  try {
    // Step 1: Initialize Firebase Admin
    initializeFirebaseAdmin();
    console.log('---[/api/upload-image] Firebase Admin SDK is ready.');

    // Step 2: Authenticate the user
    const adminAuth = getAuth();
    const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authToken) {
      console.error('---[/api/upload-image] Unauthorized: Missing auth token.');
      return NextResponse.json({ error: 'Unauthorized: Missing token.' }, { status: 401 });
    }
    
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authToken);
      console.log(`---[/api/upload-image] Token verified for UID: ${decodedToken.uid}`);
    } catch (error: any) {
      console.error(`---[/api/upload-image] Token verification failed: ${error.message}`);
      return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }

    // Step 3: Process the uploaded file from FormData
    console.log('---[/api/upload-image] Processing form data...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      console.error('---[/api/upload-image] Bad Request: No file provided.');
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    console.log(`---[/api/upload-image] File found: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

    // Step 4: Upload to Firebase Storage
    const storage = getStorage();
    const bucket = storage.bucket(BUCKET_NAME);
    console.log(`---[/api/upload-image] Acquired storage bucket: ${bucket.name}`);

    const userId = decodedToken.uid;
    const fileName = `faq_images/${userId}/${Date.now()}_${file.name}`;
    console.log(`---[/api/upload-image] Preparing to upload to path: ${fileName}`);
    
    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: file.type,
        },
        resumable: false,
    });
    
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log('---[/api/upload-image] Starting upload stream...');
    await new Promise<void>((resolve, reject) => {
        blobStream.on('error', (err) => {
            console.error('---[/api/upload-image] BLOB STREAM ERROR:', err);
            reject(new Error(`Failed to upload file to storage. GCS Error: ${err.message}`));
        });
        blobStream.on('finish', () => {
            console.log('---[/api/upload-image] BLOB STREAM FINISH: Upload completed successfully.');
            resolve();
        });
        blobStream.end(buffer);
    });

    // Step 5: Make file public and get URL
    await blob.makePublic();
    const publicUrl = blob.publicUrl();
    console.log(`---[/api/upload-image] File is public. URL: ${publicUrl}`);
    
    // Step 6: Send success response
    return NextResponse.json({ imageUrl: publicUrl }, { status: 200 });

  } catch (error: any) {
    const errorMessage = error.message || 'An unexpected error occurred.';
    console.error(`---[/api/upload-image] CATCH-ALL ERROR: ${errorMessage}`, error);
    return NextResponse.json({ error: `Server-side exception: ${errorMessage}` }, { status: 500 });
  }
}
