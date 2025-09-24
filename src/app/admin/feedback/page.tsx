import FeedbackTable from '@/components/feedback-table';

export default function FeedbackPage() {
  return (
    <main className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">User Feedback</h1>
      <FeedbackTable />
    </main>
  );
}
