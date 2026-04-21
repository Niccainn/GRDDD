/**
 * Shared motion primitives for widgets — the "breath" language.
 *
 * Grid's design memory: organic light, not shiny. teamLab/nxtmuseum,
 * not SaaS. These tokens are the motion equivalent — slower damping,
 * sine-based breathing, nothing that clicks or snaps hard.
 *
 * If you need a motion not listed here, *don't invent one inline*.
 * Add it here so every widget in the system moves the same way.
 */

/** CSS transition timings — shared across every widget microinteraction. */
export const EASE = {
  // Settling — default for enter/exit. Slower than Apple's standard.
  settle: 'cubic-bezier(0.22, 1, 0.36, 1)',
  // Breath — for subtle idle pulse and long-press jiggle replacement.
  breath: 'cubic-bezier(0.45, 0, 0.55, 1)',
  // Lift — for hover rise.
  lift: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const DURATION = {
  hover: 260,
  lift: 300,
  settle: 420,
  breath: 2200,          // full inhale + exhale cycle
  dragStart: 180,
  dragRelease: 340,
} as const;

/** The canonical hover-rise style object. */
export const LIFT_STYLE = {
  transform: 'translateY(-2px)',
  boxShadow: '0 12px 32px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.18)',
  transition: `transform ${DURATION.lift}ms ${EASE.lift}, box-shadow ${DURATION.lift}ms ${EASE.lift}`,
} as const;

/** Edit-mode breath — replaces Apple's jiggle with an organic pulse. */
export const BREATH_KEYFRAMES = `
@keyframes grid-widget-breath {
  0%   { transform: scale(1)      rotate(0deg);   }
  25%  { transform: scale(1.006)  rotate(-0.08deg); }
  50%  { transform: scale(1)      rotate(0deg);   }
  75%  { transform: scale(1.006)  rotate(0.08deg);  }
  100% { transform: scale(1)      rotate(0deg);   }
}
`;

export const EDIT_MODE_STYLE: React.CSSProperties = {
  animation: `grid-widget-breath ${DURATION.breath}ms ${EASE.breath} infinite`,
  willChange: 'transform',
};

/** Ambient drop-in animation — widget fades into place. */
export const DROP_IN_KEYFRAMES = `
@keyframes grid-widget-dropin {
  from { opacity: 0; transform: translateY(6px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0)   scale(1);     }
}
`;

export const DROP_IN_STYLE: React.CSSProperties = {
  animation: `grid-widget-dropin ${DURATION.settle}ms ${EASE.settle} both`,
  willChange: 'transform, opacity',
};
