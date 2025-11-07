'use client';

import { useSyncListeningHistory } from '@/hooks/useSyncListeningHistory';

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  // Trigger sync on mount
  useSyncListeningHistory();

  return <>{children}</>;
}
