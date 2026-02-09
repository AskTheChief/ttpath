
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

if (!getApps().length) {
  initializeApp();
}
const adminAuth = getAuth();
const bucket = getStorage().bucket(); 

export async function POST(req: NextRequest) {
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

  try {
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

    return await new Promise((resolve, reject) => {
        blobStream.on('error', (err) => {
            console.error('Error uploading to GCS:', err);
            reject(NextResponse.json({ error: 'Something went wrong during upload.' }, { status: 500 }));
        });

        blobStream.on('finish', async () => {
            try {
                await blob.makePublic();
                const publicUrl = blob.publicUrl();
                resolve(NextResponse.json({ imageUrl: publicUrl }, { status: 200 }));
            } catch(e) {
                console.error("Error making file public:", e)
                reject(NextResponse.json({ error: 'Failed to make image public.' }, { status: 500 }));
            }
        });

        blobStream.end(buffer);
    });

  } catch (error) {
    console.error('Error processing upload request:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
