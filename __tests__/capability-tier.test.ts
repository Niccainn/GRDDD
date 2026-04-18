import { describe, it, expect } from 'vitest';
import {
  capabilityTier,
  capabilityCounts,
  IMPORT_PROVIDERS,
  WEBHOOK_RECEIVERS,
  TIER_META,
} from '../lib/integrations/capability';
import { IMPLEMENTED_SYNC_PROVIDERS } from '../lib/integrations/sync/dispatcher';

/**
 * The capability tier is what the user sees as a badge on every
 * integration card. It must NEVER drift from the actual code state —
 * so these tests verify each tier is driven by the authoritative
 * set, not a hand-declared list.
 */

describe('capabilityTier', () => {
  it('classifies every IMPLEMENTED_SYNC_PROVIDERS entry as live_sync', () => {
    for (const provider of IMPLEMENTED_SYNC_PROVIDERS) {
      expect(capabilityTier(provider)).toBe('live_sync');
    }
  });

  it('classifies every import-supported provider as import (unless also live-sync)', () => {
    for (const provider of IMPORT_PROVIDERS) {
      if (IMPLEMENTED_SYNC_PROVIDERS.has(provider)) {
        // Precedence: live_sync wins — notion has both, should be live.
        expect(capabilityTier(provider)).toBe('live_sync');
      } else {
        expect(capabilityTier(provider)).toBe('import');
      }
    }
  });

  it('falls back to connect_only for anything not in a known set', () => {
    expect(capabilityTier('figma')).toBe('connect_only');
    expect(capabilityTier('airtable')).toBe('connect_only');
    expect(capabilityTier('does-not-exist')).toBe('connect_only');
  });

  it.each(['notion', 'slack', 'google_calendar', 'hubspot'])(
    '%s is live_sync (matches our public claim)',
    provider => {
      expect(capabilityTier(provider)).toBe('live_sync');
    },
  );

  it('slack is live_sync, not webhook — sync precedence', () => {
    // slack is in both WEBHOOK_RECEIVERS and IMPLEMENTED_SYNC_PROVIDERS.
    // The higher tier (live_sync) should win.
    expect(WEBHOOK_RECEIVERS.has('slack')).toBe(true);
    expect(capabilityTier('slack')).toBe('live_sync');
  });
});

describe('capabilityCounts', () => {
  it('returns accurate counts across the full registry', () => {
    // Simulate the full 110-provider registry
    const providers = [
      'notion', 'slack', 'google_calendar', 'hubspot', // live_sync
      'asana', 'monday', // import-only
      'stripe', // webhook-only
      'figma', 'airtable', 'linear', 'github', // connect_only
    ];
    const counts = capabilityCounts(providers);
    expect(counts.total).toBe(11);
    expect(counts.liveSync).toBe(4);
    expect(counts.import).toBe(2);
    expect(counts.webhook).toBe(1);
    expect(counts.connectOnly).toBe(4);
    expect(counts.liveSync + counts.import + counts.webhook + counts.connectOnly).toBe(counts.total);
  });

  it('empty input → all zeros', () => {
    expect(capabilityCounts([])).toEqual({
      total: 0, liveSync: 0, import: 0, webhook: 0, connectOnly: 0,
    });
  });
});

describe('TIER_META', () => {
  it('has an entry for every tier capabilityTier can produce', () => {
    const tiers = ['live_sync', 'import', 'webhook', 'connect_only'] as const;
    for (const t of tiers) {
      expect(TIER_META[t]).toBeDefined();
      expect(TIER_META[t].label).toBeTruthy();
      expect(TIER_META[t].shortLabel).toBeTruthy();
      expect(TIER_META[t].explainer.length).toBeGreaterThan(10);
    }
  });

  it('connect_only explainer is honest about what DOESN\'T happen', () => {
    expect(TIER_META.connect_only.explainer).toMatch(/no automatic|no continuous|connect only/i);
  });

  it('tier colours are distinct so badges are visually separable', () => {
    const colours = Object.values(TIER_META).map(m => m.color);
    expect(new Set(colours).size).toBe(colours.length);
  });
});
