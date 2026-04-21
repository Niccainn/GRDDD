'use client';
/**
 * Mode B — first week view.
 *
 * Per PHASE_3_COCKPIT.md: optimized for *trust building*, not metrics.
 * Greeting + Nova summary, then a **canvas of widgets** (not a fixed
 * grid of System cards). The widgets the user sees by default are
 * System widgets for each of their Systems, plus an "+ Add widget"
 * tile that opens the WidgetDesigner.
 *
 * The TODAY feed is a widget too (kind: 'feed'), which means it can
 * be resized, removed, or placed alongside user-added widgets without
 * special treatment.
 */
import ApprovalFeed from './ApprovalFeed';
import type { SystemCardData } from './SystemCard';
import WidgetBoard from '@/components/widgets/WidgetBoard';
import type { WidgetSpec } from '@/lib/widgets/registry';
import type { BoardData } from '@/components/widgets/WidgetBoard';

export type ModeBProps = {
  displayName: string | null;
  novaSummary: string | null;
  systems: SystemCardData[];
};

export default function ModeB_FirstWeek({
  displayName,
  novaSummary,
  systems,
}: ModeBProps) {
  const name = displayName?.split(' ')[0] ?? 'there';

  // Default system-shipped widgets: one per System, capped at 4.
  // System widgets pre-populate the canvas; users can add more via
  // the "+ Add widget" tile.
  const systemSpecs: WidgetSpec[] = systems.slice(0, 4).map(s => ({
    id: `sys_${s.id}`,
    kind: 'system',
    size: '2x2',
    title: s.name,
    source: { type: 'system', id: s.id },
    refresh: { mode: 'interval', seconds: 60 },
    origin: 'system',
  }));

  const data: BoardData = {};
  for (const s of systems) {
    data[`sys_${s.id}`] = {
      system: {
        id: s.id,
        name: s.name,
        color: s.color,
        healthScore: s.healthScore,
        lastActionText: s.lastActionText ?? null,
      },
    };
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-10">
        <p
          className="text-[11px] tracking-[0.15em] mb-2"
          style={{ color: 'var(--text-3)' }}
        >
          {greeting()}, {name.toUpperCase()}
        </p>
        <h1
          className="text-2xl font-light leading-snug"
          style={{ color: 'var(--text-1)' }}
        >
          {novaSummary ?? 'Nova is watching your Systems. Nothing needs you yet.'}
        </h1>
      </header>

      <section className="mb-12">
        <h2
          className="text-[11px] tracking-[0.15em] mb-4"
          style={{ color: 'var(--text-3)' }}
        >
          TODAY
        </h2>
        <ApprovalFeed />
      </section>

      <section>
        <h2
          className="text-[11px] tracking-[0.15em] mb-4"
          style={{ color: 'var(--text-3)' }}
        >
          YOUR CANVAS
        </h2>
        <WidgetBoard
          boardId="dashboard-default"
          systemSpecs={systemSpecs}
          data={data}
        />
      </section>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'GOOD NIGHT';
  if (h < 12) return 'GOOD MORNING';
  if (h < 18) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}
