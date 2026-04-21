/**
 * Prompt-to-Environment — shared types for the scaffold flow.
 *
 * A single paragraph from the user → Nova emits this shape →
 * the server walks it to create Systems, placeholder Workflows,
 * Canvas layout, and suggested integrations (not auto-connected;
 * the user still approves each OAuth).
 *
 * Deliberately small: the scaffold is a *starting shape*, not a
 * finished org. Users tune from here.
 */
import type { WidgetKind, WidgetSize, WidgetSource } from '@/lib/widgets/registry';

export type ScaffoldSystem = {
  /** Stable slug so the planner can reference this system in widgets. */
  slug: string;
  name: string;
  color: string;
  description: string;
  workflows: Array<{ name: string; stages: string[] }>;
  /** Integration provider ids this System benefits from. */
  suggestedIntegrations: string[];
};

export type ScaffoldWidget = {
  title: string;
  kind: Exclude<WidgetKind, 'chart'>;
  size: WidgetSize;
  /** Source, using system slug (will be resolved to real id after creation). */
  source:
    | { type: 'system'; systemSlug: string }
    | { type: 'integration'; providerId: string }
    | { type: 'query'; path: string }
    | { type: 'static'; payload: string };
  /** Grid position; optional. Falls back to auto-placement. */
  position?: { x: number; y: number; w: number; h: number };
};

export type ScaffoldCanvas = {
  name: string;
  widgets: ScaffoldWidget[];
};

export type EnvironmentScaffold = {
  environmentName: string;
  description: string;
  systems: ScaffoldSystem[];
  canvases: ScaffoldCanvas[];
  /** Integration providers to prompt the user to connect. */
  recommendedIntegrations: string[];
};

/** Helper: convert a scaffold widget source (slug-based) to a real
 * WidgetSource once the System ids are known. */
export function resolveScaffoldSource(
  source: ScaffoldWidget['source'],
  slugToId: Record<string, string>,
): WidgetSource {
  switch (source.type) {
    case 'system':
      return { type: 'system', id: slugToId[source.systemSlug] ?? source.systemSlug };
    case 'integration':
      return { type: 'integration', providerId: source.providerId };
    case 'query':
      return { type: 'query', path: source.path };
    case 'static':
      return { type: 'static', payload: source.payload };
  }
}
