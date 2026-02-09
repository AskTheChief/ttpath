
'use server';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('---[/api/upload-image] DEBUG: Request received inside the POST function. ---');
    
    // This is a test. We are confirming the route runs at all.
    // We will re-implement the upload logic in the next step.
    
    return NextResponse.json({ error: 'This is a test response. The API route is running, but the Firebase logic is disabled for debugging.' }, { status: 418 });

  } catch (error: any) {
    const errorMessage = error.message || 'An unexpected error occurred.';
    console.error(`---[/api/upload-image] DEBUG: CATCH-ALL ERROR: ${errorMessage}`, error);
    return NextResponse.json({ error: `Server-side exception: ${errorMessage}` }, { status: 500 });
  }
}
