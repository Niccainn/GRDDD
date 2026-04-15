/**
 * Workflow Marketplace — the registry of reusable WorkflowSpecs
 *
 * This is the "app store" layer for GRID workflows. Everything a tenant
 * can run is resolved through the marketplace:
 *
 *   - Built-in templates ship with the app and seed every new tenant
 *   - User-authored specs can be registered at runtime (future: DB-backed)
 *   - Third-party packs can register via the connector SDK
 *
 * The marketplace is intentionally in-memory for Phase 2 — a tiny Map
 * keyed by slug. When we add multi-tenant custom workflows in Phase 3
 * we'll swap the storage layer without touching callers, because every
 * accessor goes through `getWorkflow(slug)` / `listWorkflows(filter)`.
 *
 * Design rules:
 *   1. Everything that enters the registry is `parseSpec`-validated.
 *   2. Slugs are the stable identity — version bumps keep the same slug.
 *   3. Category + tags drive UI filtering; don't rely on name matching.
 *   4. Listing is cheap and read-only; runners call `getWorkflow` once.
 */

import { parseSpec, type WorkflowSpec } from './spec';
import { templates as builtinTemplates } from './templates';

// ─── Storage ────────────────────────────────────────────────────────────────

const registry = new Map<string, WorkflowSpec>();

// Seed with built-ins on module load. Importing templates triggers their
// individual parseSpec calls, so anything malformed fails loud at startup.
for (const spec of builtinTemplates) {
  registry.set(spec.slug, spec);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface MarketplaceFilter {
  category?: WorkflowSpec['category'];
  triggerType?: WorkflowSpec['trigger']['type'];
  tag?: string;
  search?: string;
}

/** Return a workflow spec by slug, or null if unknown. */
export function getWorkflow(slug: string): WorkflowSpec | null {
  return registry.get(slug) ?? null;
}

/** Return true if a slug exists. */
export function hasWorkflow(slug: string): boolean {
  return registry.has(slug);
}

/** List every registered workflow, newest first, with optional filters. */
export function listWorkflows(filter: MarketplaceFilter = {}): WorkflowSpec[] {
  let specs = Array.from(registry.values());

  if (filter.category) {
    specs = specs.filter((s) => s.category === filter.category);
  }
  if (filter.triggerType) {
    specs = specs.filter((s) => s.trigger.type === filter.triggerType);
  }
  if (filter.tag) {
    specs = specs.filter((s) => s.tags.includes(filter.tag!));
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    specs = specs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.tagline.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  return specs;
}

/**
 * Register a new spec (or overwrite an existing one by slug).
 * Validates via parseSpec — throws on malformed input.
 * Returns the canonicalized, parsed spec.
 */
export function registerWorkflow(input: unknown): WorkflowSpec {
  const spec = parseSpec(input);
  registry.set(spec.slug, spec);
  return spec;
}

/** Remove a spec from the registry. Returns true if it existed. */
export function unregisterWorkflow(slug: string): boolean {
  return registry.delete(slug);
}

/**
 * Lightweight summary for marketplace cards — what the UI lists
 * without loading full stage instructions.
 */
export interface WorkflowSummary {
  slug: string;
  name: string;
  tagline: string;
  category: WorkflowSpec['category'];
  tags: string[];
  triggerType: WorkflowSpec['trigger']['type'];
  stageCount: number;
  version: string;
  author?: string;
}

export function summarize(spec: WorkflowSpec): WorkflowSummary {
  return {
    slug: spec.slug,
    name: spec.name,
    tagline: spec.tagline,
    category: spec.category,
    tags: spec.tags,
    triggerType: spec.trigger.type,
    stageCount: spec.stages.length,
    version: spec.version,
    author: spec.author?.name,
  };
}

/** Convenience: all available categories in the registry. */
export function availableCategories(): Array<WorkflowSpec['category']> {
  return Array.from(new Set(Array.from(registry.values()).map((s) => s.category)));
}
