'use client';

import { useEffect, useState } from 'react';

export function useEnsureWorkspace() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/ensure-workspace', { method: 'POST' })
      .then(r => {
        if (r.ok) setReady(true);
        else setReady(true); // Don't block on failure
      })
      .catch(() => setReady(true));
  }, []);

  return ready;
}
