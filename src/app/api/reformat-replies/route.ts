import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { aiChiefResponse } from '@/ai/flows/ai-chief-response';
import { NextResponse } from 'next/server';

if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

export async function POST() {
  try {
    // Find all anonymized report entries
    const snapshot = await db.collection('journal_entries')
      .where('isAnonymizedReport', '==', true)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ reformatted: 0, message: 'No anonymized reports found.' });
    }

    let reformatted = 0;
    let errors = 0;

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const anonymizedContent = data.entryContent;

        // Regenerate AI Chief response with updated prompt
        const { response: chiefResponse } = await aiChiefResponse({ reportContent: anonymizedContent });

        // Update the feedback array — replace the ai-chief feedback
        const feedback = (data.feedback || []).map((f: any) => {
          if (f.mentorId === 'ai-chief') {
            return { ...f, feedbackContent: chiefResponse, updatedAt: Timestamp.now() };
          }
          return f;
        });

        await doc.ref.update({ feedback });
        reformatted++;
      } catch (err) {
        console.error(`Error reformatting ${doc.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({ reformatted, errors, total: snapshot.size });
  } catch (error) {
    console.error('Error reformatting replies:', error);
    return NextResponse.json({ error: 'Failed to reformat replies' }, { status: 500 });
  }
}
