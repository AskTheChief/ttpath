import { processReportsToForum } from '@/ai/flows/process-reports-to-forum';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const result = await processReportsToForum();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing reports:', error);
    return NextResponse.json({ error: 'Failed to process reports' }, { status: 500 });
  }
}
