
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// This function ensures firebase-admin is initialized only once.
function getFirebaseAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }
    
    // When running in a Google Cloud environment, the SDK will automatically
    // discover service account credentials and the storage bucket.
    return initializeApp();
}

export async function POST(req: NextRequest) {
  try {
    const app = getFirebaseAdminApp();
    const adminAuth = getAuth(app);
    // By default, getStorage().bucket() will use the default bucket from the initialized app.
    // Explicitly naming it is safer in some environments.
    const bucket = getStorage(app).bucket("studio-7790315517-f3fe6.appspot.com");

    const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(authToken);
    } catch (error) {
      console.error('Error verifying token', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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

    return await new Promise<NextResponse>((resolve) => {
        blobStream.on('error', (err) => {
            console.error('Error uploading to GCS:', err);
            resolve(NextResponse.json({ error: 'Something went wrong during upload.' }, { status: 500 }));
        });

        blobStream.on('finish', async () => {
            try {
                await blob.makePublic();
                const publicUrl = blob.publicUrl();
                resolve(NextResponse.json({ imageUrl: publicUrl }, { status: 200 }));
            } catch(e) {
                console.error("Error making file public:", e)
                resolve(NextResponse.json({ error: 'Failed to make image public.' }, { status: 500 }));
            }
        });

        blobStream.end(buffer);
    });

  } catch (error) {
    console.error('Error processing upload request:', error);
    return NextResponse.json({ error: (error as Error).message || 'Something went wrong.' }, { status: 500 });
  }
}
