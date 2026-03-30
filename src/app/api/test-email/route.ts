import { sendDirectEmail } from '@/ai/flows/send-direct-email';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const result = await sendDirectEmail(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
