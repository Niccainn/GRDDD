import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#08080C',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
        }}
      >
        <svg
          width="100"
          height="128"
          viewBox="0 0 79 100"
          fill="none"
        >
          <rect x="2" y="2" width="75" height="96" rx="10" stroke="white" strokeWidth="4" />
          <path d="M 27 2 L 27 90 Q 27 98 35 98" stroke="white" strokeWidth="4" />
          <path d="M 52 2 L 52 90 Q 52 98 60 98" stroke="white" strokeWidth="4" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
