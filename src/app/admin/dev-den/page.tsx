
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, TestTube2, MessageSquareQuestion } from 'lucide-react';
import { firestoreTest, type FirestoreTestResult } from '@/ai/flows/firestore-test';
import TutorialAnswersViewer from '@/components/admin/dev-den/tutorial-answers-viewer';

export default function DevDenPage() {
  const [testResult, setTestResult] = useState<FirestoreTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    try {
      const result = await firestoreTest({});
      setTestResult(result);
    } catch (error) {
      console.error('Firestore test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setTestResult({
        success: false,
        logs: [`Test execution failed: ${errorMessage}`],
        writtenData: null,
        readData: null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dev Den</h1>
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareQuestion />
            Comprehension Test Answers
          </CardTitle>
          <CardDescription>Review all user submissions for the comprehension test.</CardDescription>
        </CardHeader>
        <CardContent>
          <TutorialAnswersViewer />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube2 />
            Firestore Connectivity Test
          </CardTitle>
          <CardDescription>
            This test performs a simple write and read operation to a test collection in Firestore to verify backend connectivity and permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRunTest} disabled={isLoading}>
            {isLoading ? 'Running Test...' : 'Run Firestore Test'}
          </Button>
          {testResult && (
            <div className="mt-4 p-4 border rounded-lg bg-muted">
              <h3 className="font-semibold text-lg mb-2">Test Results</h3>
              <p className={`font-bold ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                Status: {testResult.success ? 'Success' : 'Failure'}
              </p>
              <div className="mt-2 space-y-2">
                <div>
                  <h4 className="font-semibold">Logs:</h4>
                  <pre className="text-xs bg-background p-2 rounded-md whitespace-pre-wrap max-h-48 overflow-auto">
                    {testResult.logs.join('\n')}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold">Data Written:</h4>
                  <pre className="text-xs bg-background p-2 rounded-md whitespace-pre-wrap">
                    {JSON.stringify(testResult.writtenData, null, 2) || 'N/A'}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold">Data Read:</h4>
                  <pre className="text-xs bg-background p-2 rounded-md whitespace-pre-wrap">
                    {JSON.stringify(testResult.readData, null, 2) || 'N/A'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
