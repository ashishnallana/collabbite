'use client';

import { use } from 'react';
import ActivityTicker from '../../../components/ActivityTicker';
import LiveChat from '../../../components/LiveChat';

export default function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      <ActivityTicker sessionId={sessionId} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {children}
      </div>
      <LiveChat sessionId={sessionId} />
    </div>
  );
}
