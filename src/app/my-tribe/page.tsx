
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CreateTribeModal from '@/components/modals/create-tribe-modal';
import JoinTribeModal from '@/components/modals/join-tribe-modal';

export default function MyTribePage() {
  const [isCreateTribeModalOpen, setCreateTribeModalOpen] = useState(false);
  const [isJoinTribeModalOpen, setJoinTribeModalOpen] = useState(false);

  // This would be fetched from your user's data
  const isGraduate = true; 

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>My Tribe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {isGraduate && (
              <Button onClick={() => setCreateTribeModalOpen(true)}>
                Start a Tribe
              </Button>
            )}
            <Button onClick={() => setJoinTribeModalOpen(true)}>
              Join a Tribe
            </Button>
          </div>
          {/* We will add the inbox for tribe applications here later */}
        </CardContent>
      </Card>

      <CreateTribeModal
        isOpen={isCreateTribeModalOpen}
        onClose={() => setCreateTribeModalOpen(false)}
      />
      <JoinTribeModal
        isOpen={isJoinTribeModalOpen}
        onClose={() => setJoinTribeModalOpen(false)}
      />
    </div>
  );
}
