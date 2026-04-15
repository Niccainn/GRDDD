'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/next';

/**
 * Only loads Vercel Analytics after the user has accepted analytics
 * cookies via the ConsentBanner. Reads the `grid_consent` cookie to
 * determine consent status.
 *
 * GDPR Art. 7: analytics must not run before explicit consent.
 */
export default function ConsentGatedAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const match = document.cookie
      .split('; ')
      .find((c) => c.startsWith('grid_consent='));
    if (match) {
      const value = decodeURIComponent(match.split('=')[1]);
      try {
        const parsed = JSON.parse(value);
        if (parsed.analytics === true) {
          setConsented(true);
        }
      } catch {
        // If value is just 'accepted' (legacy), treat as consented.
        if (value === 'accepted') setConsented(true);
      }
    }
  }, []);

  if (!consented) return null;
  return <Analytics />;
}
