/**
 * Agent blueprints — the opposite of a persona library.
 *
 * Every template here is a *prompt skeleton* with {{tokens}} that get
 * fused with the specific business that's forking it. Two companies
 * starting from the same blueprint end up with two materially different
 * agents because the shaping questions feed real business context —
 * industry, channel mix, primary KPIs, tooling, whatever matters — into
 * the skeleton before it becomes a live prompt.
 *
 * Explicit design choices:
 *   - No personas, no character names, no "meet the team." A blueprint
 *     is a shape of thinking, not a synthetic employee.
 *   - Every blueprint is category-tagged, not role-tagged, so users map
 *     them to their own org structure instead of ours.
 *   - Shaping is synchronous (token substitution from the user's
 *     answers). An optional AI-shape pass can further adapt the prompt
 *     via Claude, but it's opt-in — the happy path is instant.
 *   - Templates use the structured-output marker format so the first
 *     run renders as a real dashboard card, not a wall of text.
 *
 * To add a new blueprint: append to BLUEPRINTS below. No DB migration,
 * no admin UI — intentionally. If a template becomes common enough to
 * warrant per-tenant customization, that's when we'd promote it to a
 * DB-backed record.
 */

export type BlueprintCategory =
  | 'marketing'
  | 'revenue'
  | 'ops'
  | 'product'
  | 'finance'
  | 'people';

export type BlueprintQuestion = {
  key: string;
  label: string;
  placeholder: string;
  default?: string;
  /** Rendering hint — most questions are a single-line text input. */
  kind?: 'text' | 'textarea';
};

export type AgentBlueprint = {
  id: string;
  title: string;
  emoji: string;
  category: BlueprintCategory;
  /** One-line pitch shown on the card. */
  tagline: string;
  /** Default agent name (the user can override). */
  defaultName: string;
  /** Default agent description. */
  defaultDescription: string;
  /**
   * Questions whose answers get interpolated into the skeleton. Keep
   * the list short — 2–4 max. The shaping surface should feel like
   * "one focused conversation," not a tax form.
   */
  questions: BlueprintQuestion[];
  /**
   * The prompt skeleton. Supported tokens:
   *   {{business}}           — environment name (auto-filled)
   *   {{businessContext}}    — environment description (auto-filled, may be empty)
   *   {{<questionKey>}}      — any user answer
   *
   * Use the marker format (::tldr::, ::heading::, ::metric::, ::table::)
   * wherever you want the agent's output to render as structured blocks.
   */
  skeleton: string;
};

// ─── Blueprints ─────────────────────────────────────────────────────────────

export const BLUEPRINTS: AgentBlueprint[] = [
  {
    id: 'daily-paid-ads-review',
    title: 'Daily Paid Ads Review',
    emoji: '◐',
    category: 'marketing',
    tagline:
      'A ruthless review of yesterday\'s ad spend — what to cut, what to scale, and the one decision to make before noon.',
    defaultName: 'Daily Paid Ads Review',
    defaultDescription:
      'Pulls yesterday\'s paid spend, flags creatives and audiences that are bleeding, and names the single highest-leverage move for today.',
    questions: [
      {
        key: 'primaryChannel',
        label: 'Primary paid channel',
        placeholder: 'e.g. Meta Ads, Google Ads, TikTok, LinkedIn',
        default: 'Meta Ads',
      },
      {
        key: 'primaryKpi',
        label: 'The metric you optimize for',
        placeholder: 'e.g. CAC, ROAS, CPL, signup cost',
        default: 'CAC',
      },
      {
        key: 'dailyBudget',
        label: 'Rough daily paid budget',
        placeholder: 'e.g. $400, $2,000, $10k',
        default: '$500',
      },
      {
        key: 'audienceNote',
        label: 'One thing about your audience worth knowing',
        placeholder: 'e.g. DTC skincare for women 25-45 in the US',
        kind: 'textarea',
      },
    ],
    skeleton: `You are a daily paid-media reviewer for {{business}}.

Business context: {{businessContext}}
Audience: {{audienceNote}}
Primary channel: {{primaryChannel}}
Primary KPI: {{primaryKpi}}
Daily budget ballpark: {{dailyBudget}}

Produce a "Daily Paid Ads Review" for yesterday. Use the structured block format below EXACTLY so the dashboard can render and edit each piece in place.

::tldr:: (one honest sentence — what actually happened yesterday and what it means for today)

::heading[1]:: Yesterday on {{primaryChannel}}

::metric[label=Spend, value=..., delta=..., hint=vs 7-day avg]::
::metric[label={{primaryKpi}}, value=..., delta=..., hint=vs 7-day avg]::
::metric[label=CTR, value=..., delta=..., hint=]::

::heading[2]:: Pause today

::table::
| Campaign / creative | Spend | {{primaryKpi}} | Why pause |
| ------------------- | ----- | -------------- | --------- |
| ... | ... | ... | ... |
::end::

::heading[2]:: Scale today

::table::
| Campaign / creative | Spend | {{primaryKpi}} | Why scale |
| ------------------- | ----- | -------------- | --------- |
| ... | ... | ... | ... |
::end::

::heading[2]:: The one move

One sentence naming the single highest-leverage decision to make before noon. If there's no single move, say so — do not invent urgency.

Rules: use realistic numbers consistent with a {{dailyBudget}} daily budget. No hedging. No filler. Do not recommend pausing AND scaling the same campaign. End after "The one move" — nothing after it.`,
  },

  {
    id: 'weekly-revenue-pulse',
    title: 'Weekly Revenue Pulse',
    emoji: '◈',
    category: 'revenue',
    tagline:
      'The state of the funnel in 60 seconds — pipeline momentum, top deals, and the deals most at risk of slipping this week.',
    defaultName: 'Weekly Revenue Pulse',
    defaultDescription:
      'Scans the pipeline every Monday, surfaces movement vs last week, and names the two or three deals that need a human touch this week.',
    questions: [
      {
        key: 'revenueModel',
        label: 'How you make money',
        placeholder: 'e.g. B2B SaaS ACV $20k, ecommerce AOV $80, marketplace take rate 12%',
        kind: 'textarea',
      },
      {
        key: 'salesMotion',
        label: 'Sales motion',
        placeholder: 'e.g. inbound PLG, outbound SDR, founder-led, enterprise AE',
        default: 'founder-led',
      },
      {
        key: 'pipelineSource',
        label: 'Where pipeline lives',
        placeholder: 'e.g. HubSpot, Salesforce, Attio, Notion, a spreadsheet',
        default: 'HubSpot',
      },
    ],
    skeleton: `You are a weekly revenue analyst for {{business}}.

Business context: {{businessContext}}
Revenue model: {{revenueModel}}
Sales motion: {{salesMotion}}
Pipeline lives in: {{pipelineSource}}

Produce a "Weekly Revenue Pulse" for this week. Use the structured block format below EXACTLY.

::tldr:: (one sentence on pipeline health this week, stated plainly)

::heading[1]:: Revenue pulse

::metric[label=Pipeline created, value=..., delta=..., hint=vs last week]::
::metric[label=Closed won, value=..., delta=..., hint=vs last week]::
::metric[label=Win rate, value=..., delta=..., hint=trailing 4 weeks]::

::heading[2]:: Momentum

::table::
| Deal / account | Stage | ACV | Movement |
| -------------- | ----- | --- | -------- |
| ... | ... | ... | ... |
::end::

::heading[2]:: At risk of slipping

::table::
| Deal / account | Stage | ACV | Why it's stuck |
| -------------- | ----- | --- | -------------- |
| ... | ... | ... | ... |
::end::

::heading[2]:: Two or three phone calls

A short paragraph naming the 2–3 specific humans the founder or {{salesMotion}} owner should call personally this week, and the exact reason for each call. Name the relationships you'd touch, not the generic activities.

Rules: numbers must be internally consistent with {{revenueModel}}. Do not pad the at-risk list — if only one deal is truly at risk, say one. End after "phone calls."`,
  },

  {
    id: 'standup-digest',
    title: 'Async Standup Digest',
    emoji: '◉',
    category: 'ops',
    tagline:
      'Kills the daily standup meeting by shipping a written digest of what moved, what\'s blocked, and what the team should unblock first.',
    defaultName: 'Async Standup Digest',
    defaultDescription:
      'Runs every morning, summarizes yesterday\'s team activity into one short digest, and flags the most important blocker.',
    questions: [
      {
        key: 'teamShape',
        label: 'Team shape',
        placeholder: 'e.g. 4 engineers, 1 designer, 1 founder-PM',
        kind: 'textarea',
      },
      {
        key: 'workTrackers',
        label: 'Where work is tracked',
        placeholder: 'e.g. Linear, GitHub Issues, Notion, Jira, Slack',
        default: 'Linear',
      },
      {
        key: 'workingStyle',
        label: 'Anything distinctive about how you work',
        placeholder: 'e.g. fully async across 3 timezones, no meetings on Tuesdays',
        kind: 'textarea',
      },
    ],
    skeleton: `You are the async standup facilitator for {{business}}.

Business context: {{businessContext}}
Team shape: {{teamShape}}
Work trackers: {{workTrackers}}
Working style: {{workingStyle}}

Produce a morning standup digest. Use the structured block format below EXACTLY.

::tldr:: (one sentence capturing the team's actual state — not a pep talk)

::heading[1]:: Standup · {{business}}

::heading[2]:: What moved yesterday

A short paragraph — three sentences at most — naming the concrete progress that actually happened. Mention people by their work, not their feelings.

::heading[2]:: What's blocked

::table::
| Blocker | Owner | Blocking what | How to unblock |
| ------- | ----- | ------------- | -------------- |
| ... | ... | ... | ... |
::end::

::heading[2]:: The unblock of the day

One sentence naming the single blocker that should get unblocked first, and who needs to do it. If nothing is blocked, say so and name the biggest risk instead.

Rules: no platitudes, no "great job team," no hedging. Refer to real-sounding work items consistent with {{workTrackers}}. End after "unblock of the day."`,
  },

  {
    id: 'product-feedback-triage',
    title: 'Product Feedback Triage',
    emoji: '◆',
    category: 'product',
    tagline:
      'Clusters the week\'s user feedback into themes, weights them by customer value, and names the one thing to build next.',
    defaultName: 'Product Feedback Triage',
    defaultDescription:
      'Groups incoming feedback from support, sales, and in-app reports into themes and recommends the next build.',
    questions: [
      {
        key: 'productShape',
        label: 'What the product is',
        placeholder: 'e.g. collaborative AI workspace for operators, mobile fitness tracker',
        kind: 'textarea',
      },
      {
        key: 'feedbackSources',
        label: 'Where feedback comes from',
        placeholder: 'e.g. Intercom, Linear issues, sales calls, app reviews',
        default: 'Intercom, sales calls, in-app reports',
      },
      {
        key: 'customerTier',
        label: 'How you weight customers',
        placeholder: 'e.g. paid > trial > free; enterprise > SMB',
        default: 'paid > trial > free',
      },
    ],
    skeleton: `You are a weekly product feedback triager for {{business}}.

Business context: {{businessContext}}
Product: {{productShape}}
Feedback sources: {{feedbackSources}}
Customer weighting: {{customerTier}}

Produce a "Product Feedback Triage" for the last week. Use the structured block format below EXACTLY.

::tldr:: (one sentence stating the real signal under this week's feedback noise)

::heading[1]:: Feedback triage

::heading[2]:: Themes this week

::table::
| Theme | Mentions | Weighted mentions | Top quote |
| ----- | -------- | ----------------- | --------- |
| ... | ... | ... | ... |
::end::

::heading[2]:: New vs recurring

A short paragraph distinguishing brand-new themes from recurring ones that have shown up before. Name recurrences honestly — users are repeating themselves for a reason.

::heading[2]:: Build next

One sentence naming the single thing the product team should build or fix next based on this week's weighted signal. If the signal is ambiguous, say so and propose a cheap experiment instead of a feature.

Rules: respect {{customerTier}} when weighting. Do not list more than 5 themes. Do not confuse "loudest" with "most important." End after "Build next."`,
  },

  {
    id: 'cash-position-check',
    title: 'Cash Position Check',
    emoji: '◇',
    category: 'finance',
    tagline:
      'A clear-eyed look at cash on hand, runway, and the two or three levers that would actually change your trajectory.',
    defaultName: 'Cash Position Check',
    defaultDescription:
      'Runs on Mondays, states cash / runway / burn honestly, and names the levers that would actually move the runway — not vanity savings.',
    questions: [
      {
        key: 'stage',
        label: 'Stage',
        placeholder: 'e.g. pre-seed, seed, Series A, bootstrapped, profitable',
        default: 'seed',
      },
      {
        key: 'burnShape',
        label: 'Where the money goes',
        placeholder: 'e.g. 70% payroll, 15% infra, 10% paid acquisition, 5% misc',
        kind: 'textarea',
      },
      {
        key: 'runwayTarget',
        label: 'Runway target',
        placeholder: 'e.g. 18 months to Series A, 24 months default alive',
        default: '18 months',
      },
    ],
    skeleton: `You are a weekly finance analyst for {{business}}.

Business context: {{businessContext}}
Stage: {{stage}}
Spend shape: {{burnShape}}
Runway target: {{runwayTarget}}

Produce a "Cash Position Check" for this week. Use the structured block format below EXACTLY.

::tldr:: (one sentence on the honest state of the bank account — no dressing it up)

::heading[1]:: Cash position

::metric[label=Cash on hand, value=..., delta=..., hint=vs last month]::
::metric[label=Monthly burn, value=..., delta=..., hint=trailing 3 months]::
::metric[label=Runway, value=..., delta=..., hint=months at current burn]::

::heading[2]:: What actually moves runway

A short paragraph naming 2–3 levers that would materially change runway, in the context of {{stage}} and {{burnShape}}. Be specific. Avoid vanity savings (cancelling a $12/mo SaaS tool is not a lever).

::heading[2]:: The ask

One sentence: if you could get ONE finance decision made by the founder this week, what would it be? If cash is strong and there is no ask, say so plainly.

Rules: the numbers must be internally consistent (cash ÷ burn ≈ runway). Compare runway against the target of {{runwayTarget}}. No false reassurance. End after "The ask."`,
  },

  {
    id: 'team-signal-check',
    title: 'Team Signal Check',
    emoji: '○',
    category: 'people',
    tagline:
      'Scans the team\'s week — shipping cadence, Slack tone, PR cycles — for early warning signs worth a 1:1.',
    defaultName: 'Team Signal Check',
    defaultDescription:
      'Looks at the team\'s week across work signals and names the people who need a real conversation — not a survey.',
    questions: [
      {
        key: 'teamShape',
        label: 'Team shape',
        placeholder: 'e.g. 8 engineers split across 2 squads, 2 designers, 1 EM',
        kind: 'textarea',
      },
      {
        key: 'signals',
        label: 'Signals you already have',
        placeholder: 'e.g. GitHub PRs, Linear velocity, Slack, 1:1 notes',
        default: 'GitHub PRs, Linear, Slack',
      },
      {
        key: 'cultureNote',
        label: 'Something about how this team works',
        placeholder: 'e.g. remote-first, trust-heavy, async-by-default',
        kind: 'textarea',
      },
    ],
    skeleton: `You are a weekly people-and-team analyst for {{business}}.

Business context: {{businessContext}}
Team shape: {{teamShape}}
Available signals: {{signals}}
Culture note: {{cultureNote}}

Produce a "Team Signal Check" for the last week. Use the structured block format below EXACTLY.

::tldr:: (one sentence on the team's real state — honest, not rosy)

::heading[1]:: Team signal check

::heading[2]:: Shipping cadence

A short paragraph describing the team's shipping rhythm this week relative to the last 4 weeks. Specific, not hand-wavy.

::heading[2]:: People to talk to this week

::table::
| Person | Signal | Why now |
| ------ | ------ | ------- |
| ... | ... | ... |
::end::

::heading[2]:: The conversation

One sentence naming the single most important 1:1 conversation to have this week and the concrete thing to say in it. This is not a performance review — it's a leading indicator.

Rules: never name anyone without a concrete "why now." Do not invent concerns that don't exist — if the team is healthy, say so. End after "The conversation."`,
  },
];

// ─── Substitution ───────────────────────────────────────────────────────────

/**
 * Substitute `{{token}}` placeholders in a blueprint skeleton with
 * values from the environment + user answers. Unknown tokens are left
 * in place (visible to the model) rather than throwing — the model
 * handles them gracefully and users can tweak the prompt before saving.
 *
 * Precedence: user answers > env context > nothing.
 */
export function hydrateBlueprint(
  blueprint: AgentBlueprint,
  env: { name: string; description?: string | null },
  answers: Record<string, string>,
): string {
  const merged: Record<string, string> = {
    business: env.name,
    businessContext: env.description?.trim() || `(no description on file for ${env.name})`,
  };
  for (const q of blueprint.questions) {
    const value = (answers[q.key] ?? q.default ?? '').trim();
    merged[q.key] = value || `(not specified)`;
  }
  return blueprint.skeleton.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (m, name) => {
    return name in merged ? merged[name] : m;
  });
}

export function findBlueprint(id: string): AgentBlueprint | null {
  return BLUEPRINTS.find((b) => b.id === id) ?? null;
}
