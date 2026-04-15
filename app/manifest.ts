import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GRID',
    short_name: 'GRID',
    description: 'Adaptive Organizational Infrastructure — your AI-powered workspace OS',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#08080C',
    theme_color: '#08080C',
    orientation: 'any',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
