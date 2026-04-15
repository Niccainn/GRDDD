'use client';

import { useEffect, useState, useRef } from 'react';
import { useFeatureTour, type TourStep } from '@/lib/hooks/use-feature-tour';

export default function FeatureTour() {
  const { active, step, currentStep, totalSteps, next, skip } = useFeatureTour();
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !step) return;

    function updatePosition() {
      const el = document.querySelector(step!.target);
      if (!el) { setPos(null); return; }
      const rect = el.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [active, step]);

  if (!active || !step || !pos) return null;

  // Calculate tooltip position
  const tooltipStyle: React.CSSProperties = {};
  const gap = 12;

  switch (step.position) {
    case 'bottom':
      tooltipStyle.top = pos.top + pos.height + gap;
      tooltipStyle.left = pos.left + pos.width / 2;
      tooltipStyle.transform = 'translateX(-50%)';
      break;
    case 'top':
      tooltipStyle.bottom = window.innerHeight - pos.top + gap;
      tooltipStyle.left = pos.left + pos.width / 2;
      tooltipStyle.transform = 'translateX(-50%)';
      break;
    case 'right':
      tooltipStyle.top = pos.top + pos.height / 2;
      tooltipStyle.left = pos.left + pos.width + gap;
      tooltipStyle.transform = 'translateY(-50%)';
      break;
    case 'left':
      tooltipStyle.top = pos.top + pos.height / 2;
      tooltipStyle.right = window.innerWidth - pos.left + gap;
      tooltipStyle.transform = 'translateY(-50%)';
      break;
  }

  return (
    <>
      {/* Backdrop overlay with cutout */}
      <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: 'none' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={pos.left - 4}
                y={pos.top - 4}
                width={pos.width + 8}
                height={pos.height + 8}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#tour-mask)" />
        </svg>
        {/* Highlight ring */}
        <div
          className="absolute rounded-lg"
          style={{
            top: pos.top - 4,
            left: pos.left - 4,
            width: pos.width + 8,
            height: pos.height + 8,
            border: '2px solid rgba(191,159,241,0.5)',
            boxShadow: '0 0 20px rgba(191,159,241,0.15)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999] w-72 rounded-xl p-4"
        style={{
          ...tooltipStyle,
          background: 'rgba(12,12,18,0.95)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(191,159,241,0.25)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
          animation: 'fade-in 0.3s ease',
        }}
      >
        {/* Step counter */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] tracking-wider" style={{ color: 'rgba(191,159,241,0.6)' }}>
            {currentStep + 1} / {totalSteps}
          </span>
          <button onClick={skip} className="text-[10px]" style={{ color: 'var(--text-3)' }}>
            Skip tour
          </button>
        </div>

        <h3 className="text-sm font-light mb-1" style={{ color: 'var(--text-1)' }}>
          {step.title}
        </h3>
        <p className="text-xs font-light leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>
          {step.description}
        </p>

        <div className="flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === currentStep ? 12 : 4,
                  height: 4,
                  background: i === currentStep ? 'rgba(191,159,241,0.7)' : i < currentStep ? 'rgba(191,159,241,0.3)' : 'rgba(255,255,255,0.1)',
                }}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="text-xs font-light px-4 py-1.5 rounded-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(113,147,237,0.3), rgba(191,159,241,0.3))',
              border: '1px solid rgba(191,159,241,0.3)',
              color: 'white',
            }}
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}
