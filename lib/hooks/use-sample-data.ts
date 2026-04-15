'use client';

import { useState, useEffect } from 'react';

export function useSampleData() {
  const [hasSampleData, setHasSampleData] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check localStorage for dismissal
    if (localStorage.getItem('grid-sample-dismissed') === '1') {
      setDismissed(true);
      return;
    }

    // Check if sample data exists by looking at tasks list
    fetch('/api/tasks?q=sample')
      .then(r => r.json())
      .then(d => {
        // If there are tasks with sample label, show banner
        const sampleTasks = (d.tasks ?? []).filter((t: { labels: string | null }) => {
          try { return JSON.parse(t.labels ?? '[]').includes('sample'); } catch { return false; }
        });
        setHasSampleData(sampleTasks.length > 0);
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem('grid-sample-dismissed', '1');
  }

  async function clearSampleData() {
    await fetch('/api/sample-data', { method: 'DELETE' });
    setHasSampleData(false);
    localStorage.removeItem('grid-sample-dismissed');
  }

  return { hasSampleData: hasSampleData && !dismissed, dismiss, clearSampleData };
}
