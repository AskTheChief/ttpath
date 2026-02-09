
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const BUCKET_NAME = 'studio-7790315517-f3fe6.appspot.com';

let adminApp: App;

if (getApps().length === 0) {
  adminApp = initializeApp({
    storageBucket: BUCKET_NAME,
  });
} else {
  adminApp = getApps()[0];
}


export async function POST(req: NextRequest) {
  try {
    console.log('---[/api/upload-image] Received new upload request...');

    // Step 2: Authenticate the user (optional with open rules, but good practice)
    const adminAuth = getAuth(adminApp);
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

    // Step 4: Upload to Firebase Storage, explicitly using the provided bucket name
    const storage = getStorage(adminApp);
    const bucket = storage.bucket(); // Bucket is already specified in initializeApp
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
