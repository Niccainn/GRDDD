/**
 * Skill taxonomy — the four orthogonal dimensions that classify
 * every step a Project can contain.
 *
 * A "skill" is not a flat string any more. It's a tuple of:
 *
 *    (Location, Action, Interaction, Execution)
 *
 * The product of the four enums is the full skill space. Nova's
 * planner chooses a point in this space for each step; the
 * dispatcher routes on (Location, Action); the UI shows all four
 * badges so the user can understand AND edit any dimension.
 *
 * Backwards compatibility: existing Steps that only carry the
 * legacy `tool` + `action` pair still work — the dispatcher falls
 * back to the flat skill id if the classifiers aren't present.
 */

// ─── LOCATION — where the action happens ─────────────────────────

export const LOCATIONS = [
  // Design surfaces
  'figma',
  'canva',
  'adobe_illustrator',
  'adobe_photoshop',
  'adobe_indesign',
  // Knowledge surfaces
  'notion',
  'google_docs',
  'confluence',
  // Messaging
  'slack',
  'gmail',
  'outlook',
  'teams',
  // Calendar
  'google_calendar',
  'outlook_calendar',
  // Storage
  'google_drive',
  'dropbox',
  's3',
  // Ads
  'meta_ads',
  'google_ads',
  'linkedin_ads',
  'tiktok_ads',
  // Business
  'stripe',
  'quickbooks',
  'hubspot',
  'attio',
  'salesforce',
  // Eng / product
  'linear',
  'jira',
  'github',
  'gitlab',
  // Non-tool surfaces
  'claude_reasoning', // pure LLM reasoning, no external tool
  'grid_internal',    // operates on GRID data (Goals, Systems, etc.)
  'human_decision',   // an explicit person-level checkpoint
  'browser',          // generic web automation fallback
] as const;

export type Location = (typeof LOCATIONS)[number];

// ─── ACTION — what is being done ─────────────────────────────────

export const ACTIONS = [
  'fetch',      // read from a source
  'create',     // make a new artifact
  'update',     // modify an existing artifact
  'delete',     // remove
  'compose',    // Claude composes text / content
  'export',     // transform to another format
  'upload',     // move into another location
  'send',       // transmit (email, message, DM)
  'publish',    // make public / go live
  'schedule',   // time-delayed send / publish
  'approve',    // pass a gate
  'reject',     // block at a gate
  'analyze',    // derive insight from data
  'review',     // human inspection
  'notify',     // notify a human
  'sync',       // pull / push to keep two sources aligned
] as const;

export type Action = (typeof ACTIONS)[number];

// ─── INTERACTION — human involvement pattern ─────────────────────

export const INTERACTIONS = [
  'none',                    // Nova runs with no human involvement
  'review_before_next',      // Nova acts; human reviews before next step
  'approve_before_executing', // human must approve before Nova acts
  'human_only',              // human performs; Nova just logs
  'notify_after',            // Nova acts; human is notified
  'pair',                    // Nova + human collaborate in real time
  'schedule_for_later',      // queued with a cancel window for the human
] as const;

export type Interaction = (typeof INTERACTIONS)[number];

// ─── EXECUTION — how the step actually runs ──────────────────────

export const EXECUTIONS = [
  'auto_immediate',    // runs as soon as eligible
  'auto_on_approval',  // runs after the gate is cleared
  'auto_on_schedule',  // runs at a future time
  'async',             // queued; runs when capacity allows
  'manual',            // user triggers explicitly
  'on_demand',         // fires only when invoked by another step
] as const;

export type Execution = (typeof EXECUTIONS)[number];

// ─── CLASSIFIER — the tuple Steps carry ──────────────────────────

export type Classifier = {
  location: Location;
  action: Action;
  interaction: Interaction;
  execution: Execution;
};

export function describeClassifier(c: Classifier): string {
  return `${c.location} · ${c.action} · ${c.interaction} · ${c.execution}`;
}

// ─── VALIDATION — not every tuple is meaningful ──────────────────

/**
 * Sanity check: does this combination make sense? Catches obvious
 * nonsense like "human_decision + create + none + async".
 */
export function isValidCombo(c: Classifier): boolean {
  if (c.location === 'human_decision') {
    return c.interaction === 'human_only' && c.action === 'review';
  }
  if (c.location === 'claude_reasoning') {
    return c.action === 'compose' || c.action === 'analyze' || c.action === 'fetch';
  }
  if (c.interaction === 'approve_before_executing' && c.execution === 'auto_immediate') {
    // If a human must approve first, the execution cannot be immediate.
    return false;
  }
  return true;
}

// ─── DEFAULT CLASSIFIER FOR A FLAT SKILL ID ──────────────────────

/**
 * Map a legacy flat skill id (e.g. `figma.create_logo_explorations`)
 * to the best-guess Classifier tuple. Used for backwards compat.
 */
export function classifierFromLegacyId(skillId: string): Classifier {
  const [rawLocation, rawAction] = skillId.split('.', 2);
  const location = LOCATIONS.includes(rawLocation as Location)
    ? (rawLocation as Location)
    : rawLocation === 'human'
    ? 'human_decision'
    : rawLocation === 'claude'
    ? 'claude_reasoning'
    : 'grid_internal';

  const action: Action = (() => {
    const s = (rawAction ?? '').toLowerCase();
    if (s.includes('fetch') || s.includes('read')) return 'fetch';
    if (s.includes('create') || s.includes('draft')) return 'create';
    if (s.includes('update') || s.includes('edit')) return 'update';
    if (s.includes('compose') || s.includes('summarize')) return 'compose';
    if (s.includes('export')) return 'export';
    if (s.includes('upload')) return 'upload';
    if (s.includes('send') || s.includes('email')) return 'send';
    if (s.includes('publish') || s.includes('post')) return 'publish';
    if (s.includes('review')) return 'review';
    if (s.includes('schedule')) return 'schedule';
    return 'create';
  })();

  const interaction: Interaction =
    location === 'human_decision' ? 'human_only' : 'none';
  const execution: Execution =
    location === 'human_decision' ? 'manual' : 'auto_immediate';

  return { location, action, interaction, execution };
}
