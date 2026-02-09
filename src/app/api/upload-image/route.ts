'use server';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const BUCKET_NAME = 'studio-7790315517-f3fe6.appspot.com';

// Initialize Firebase Admin SDK, ensuring the storage bucket is specified.
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    storageBucket: BUCKET_NAME,
  });
}

export async function POST(req: NextRequest) {
  try {
    const adminAuth = getAuth();
    const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized: Missing token.' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authToken);
    } catch (error) {
      console.error('API Error: Error verifying token', error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Explicitly get the bucket by name, as suggested by the error message.
    const bucket = getStorage().bucket(BUCKET_NAME);
    
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
            console.error('STREAM ERROR: Error during GCS upload:', err);
            reject(new Error(`Failed to upload file to storage. GCS Error: ${err.message}`));
        });
        blobStream.on('finish', () => {
            resolve();
        });
        blobStream.end(buffer);
    });

    await blob.makePublic();
    const publicUrl = blob.publicUrl();
    
    return NextResponse.json({ imageUrl: publicUrl }, { status: 200 });

  } catch (error: any) {
    console.error(`---[/api/upload-image] Error: ${error.message}`);
    const message = error.message || 'An unexpected error occurred processing the request.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
