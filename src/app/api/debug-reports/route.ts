import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { NextResponse } from 'next/server';

if (!getApps().length) { initializeApp(); }
const db = getFirestore();

export async function GET() {
  const snap = await db.collection('journal_entries').where('userId', '==', 'anonymized-tribe-member').get();
  const entries = snap.docs.map(d => ({ id: d.id, isAnonymizedReport: d.data().isAnonymizedReport, subject: d.data().subject, hasFeedback: (d.data().feedback || []).length }));
  return NextResponse.json({ total: entries.length, entries });
}
