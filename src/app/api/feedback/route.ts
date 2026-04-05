import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { NextResponse } from 'next/server';

if (!getApps().length) { initializeApp(); }
const db = getFirestore();

export async function PATCH(request: Request) {
  const { id, status, notes } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const update: any = {};
  if (status) update.status = status;
  if (notes !== undefined) update.notes = notes;

  try {
    await db.collection('feedback').doc(id).update(update);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
