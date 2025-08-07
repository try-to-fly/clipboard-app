import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { StatisticsModal } from '../Statistics/StatisticsModal';
import type { Statistics } from '../../types/clipboard';

export const MenuEventHandler: React.FC = () => {
  const [showStatistics, setShowStatistics] = useState(false);
  const [statistics, setStatistics] = useState<Statistics | null>(null);

  useEffect(() => {
    const setupListeners = async () => {
      // Listen for statistics display event
      const unlistenStats = await listen('show_statistics', (event) => {
        setStatistics(event.payload as Statistics);
        setShowStatistics(true);
      });

      // Listen for monitoring toggle updates
      const unlistenMonitoring = await listen('monitoring_toggled', (event) => {
        const isMonitoringNow = event.payload as boolean;
        console.log('Monitoring toggled:', isMonitoringNow);
      });

      // Listen for history cleared event
      const unlistenHistory = await listen('history_cleared', () => {
        console.log('History cleared from menu');
        // The clipboard store will automatically refresh
      });

      return () => {
        unlistenStats();
        unlistenMonitoring();
        unlistenHistory();
      };
    };

    setupListeners();
  }, []);

  return (
    <>
      {showStatistics && statistics && (
        <StatisticsModal
          isOpen={showStatistics}
          onClose={() => setShowStatistics(false)}
          statistics={statistics}
        />
      )}
    </>
  );
};