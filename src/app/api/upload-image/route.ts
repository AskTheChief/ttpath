
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';

// This function ensures Firebase is initialized only once.
function initializeFirebaseAdmin(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }
  // Initialize without arguments to use default credentials in the cloud environment
  return initializeApp();
}

export async function POST(req: NextRequest) {
  try {
    console.log('---[/api/upload-image] DEBUG: Request received. ---');
    
    const adminApp = initializeFirebaseAdmin();
    console.log('---[/api/upload-image] DEBUG: Firebase Admin initialized. ---');

    const bucket = getStorage(adminApp).bucket();
    console.log(`---[/api/upload-image] DEBUG: Storage bucket obtained: ${bucket.name} ---`);
    
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
        console.error('---[/api/upload-image] DEBUG: Authorization token missing. ---');
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    try {
        await getAuth(adminApp).verifyIdToken(token);
        console.log('---[/api/upload-image] DEBUG: ID token verified successfully. ---');
    } catch (authError: any) {
        console.error(`---[/api/upload-image] DEBUG: ID token verification failed: ${authError.message} ---`, authError);
        return NextResponse.json({ error: 'Invalid authentication token.' }, { status: 403 });
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      console.error('---[/api/upload-image] DEBUG: No file found in request. ---');
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    
    console.log(`---[/api/upload-image] DEBUG: File received: ${file.name}, size: ${file.size}, type: ${file.type} ---`);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${randomUUID()}.${fileExtension}`;
    
    const fileUpload = bucket.file(uniqueFilename);
    console.log(`---[/api/upload-image] DEBUG: Starting upload to gs://${bucket.name}/${uniqueFilename} ---`);

    await fileUpload.save(fileBuffer, {
      metadata: { contentType: file.type },
    });
    console.log('---[/api/upload-image] DEBUG: File saved successfully. ---');
    
    await fileUpload.makePublic();
    console.log('---[/api/upload-image] DEBUG: File made public. ---');

    const publicUrl = fileUpload.publicUrl();
    console.log(`---[/api/upload-image] DEBUG: Public URL generated: ${publicUrl} ---`);

    return NextResponse.json({ imageUrl: publicUrl });

  } catch (error: any) {
    const errorMessage = error.message || 'An unexpected error occurred.';
    console.error(`---[/api/upload-image] DEBUG: CATCH-ALL ERROR: ${errorMessage}`, error);
    return NextResponse.json({ error: `Server-side exception: ${errorMessage}` }, { status: 500 });
  }
}
