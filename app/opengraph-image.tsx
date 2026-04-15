import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GRID — The Adaptive Workspace for Modern Teams';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#08080C',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo mark */}
        <svg
          width="80"
          height="100"
          viewBox="0 0 79 100"
          fill="none"
        >
          <rect x="2" y="2" width="75" height="96" rx="10" stroke="white" strokeWidth="2.5" />
          <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="2.5" />
          <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="2.5" />
        </svg>

        {/* Brand name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 300,
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.85)',
            marginTop: 32,
          }}
        >
          GRID
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 300,
            color: 'rgba(255,255,255,0.4)',
            marginTop: 16,
          }}
        >
          The Adaptive Workspace for Modern Teams
        </div>
      </div>
    ),
    { ...size }
  );
}
