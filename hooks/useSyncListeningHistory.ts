import { useEffect } from 'react';

export function useSyncListeningHistory() {
  useEffect(() => {
    const sync = async () => {
      const lastSync = localStorage.getItem('lastSync');
      const now = Date.now();

      // Sync if >30 minutes since last sync or never synced
      if (!lastSync || now - parseInt(lastSync) > 30 * 60 * 1000) {
        try {
          console.log('🔄 Triggering listening history sync...');
          const response = await fetch('/api/sync/listening-history', {
            method: 'POST',
          });

          if (response.ok) {
            localStorage.setItem('lastSync', now.toString());
            const data = await response.json();
            console.log(`✅ Sync successful: ${data.newPlays} new plays`);
          } else {
            console.error('❌ Sync failed:', response.statusText);
          }
        } catch (error) {
          console.error('❌ Sync error:', error);
        }
      } else {
        const minutesSinceSync = Math.floor((now - parseInt(lastSync)) / 60000);
        console.log(`⏰ Last sync was ${minutesSinceSync} minutes ago. Waiting...`);
      }
    };

    sync();
  }, []);
}
