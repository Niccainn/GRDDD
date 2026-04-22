/**
 * Onboarding wedges — one concrete recurring job per card.
 *
 * Per PHASE_2_ONBOARDING.md: ship 2 wedges first (inbox-triage,
 * calendar-defense). Add wedges 3–6 only after 5 users have used
 * the first 2. A wedge is only shown if its required integrations
 * are already wired — if the catalog doesn't have them, don't list it.
 */

export type WedgeId =
  | 'inbox-triage'
  | 'calendar-defense'
  | 'content-pipeline'
  | 'client-onboarding'
  | 'invoice-capture'
  | 'custom';

import type { DepartmentId } from '@/lib/widgets/department-catalog';

export type Wedge = {
  id: WedgeId;
  title: string;
  oneLiner: string;
  integrations: string[]; // integration IDs required for this wedge
  minutes: number; // honest estimate end-to-end
  systemName: string; // name given to the System Nova will create
  systemColor: string;
  workflowName: string;
  /** Steps Nova will stream as it builds. Pre-warmed templates — honest theatre. */
  buildSteps: string[];
  shipped: boolean; // gate — don't show unshipped wedges
  /** Which department's widget catalog the customize step should draw from. */
  department?: DepartmentId;
};

export const WEDGES: Wedge[] = [
  {
    id: 'inbox-triage',
    title: 'Inbox triage & reply drafting',
    oneLiner: 'Nova sorts your inbox and drafts replies in your voice.',
    integrations: ['google_workspace'],
    minutes: 3,
    systemName: 'Inbox Triage',
    systemColor: '#7193ED',
    workflowName: 'Classify → Draft → Review',
    buildSteps: [
      'Creating System: Inbox Triage',
      'Adding Workflow: Classify → Draft → Review',
      'Connecting Gmail',
      'Training on your last 30 days of replies',
      'Ready — drafts waiting for your review',
    ],
    shipped: true,
  },
  {
    id: 'calendar-defense',
    title: 'Founder calendar defense',
    oneLiner: 'Nova declines low-value meetings and protects your focus time.',
    integrations: ['google_calendar'],
    minutes: 3,
    systemName: 'Calendar Defense',
    systemColor: '#BF9FF1',
    workflowName: 'Incoming invite → Evaluate → Suggest response',
    buildSteps: [
      'Creating System: Calendar Defense',
      'Adding Workflow: Incoming invite → Evaluate → Suggest response',
      'Connecting Google Calendar',
      'Analyzing your last 60 days of meetings',
      'Ready — 2 suggestions waiting',
    ],
    shipped: true,
  },
  // Below this line: scaffolded but not shipped. Flip `shipped: true`
  // once 5+ users have successfully run the two shipped wedges.
  {
    id: 'content-pipeline',
    title: 'Weekly content pipeline',
    oneLiner: 'Ideas → drafts → review → publish, weekly cadence.',
    integrations: ['notion', 'slack'],
    minutes: 4,
    systemName: 'Content Engine',
    systemColor: '#C8F26B',
    workflowName: 'Brief → Draft → Review → Publish',
    buildSteps: [
      'Creating System: Content Engine',
      'Adding Workflow: Brief → Draft → Review → Publish',
      'Connecting Notion',
      'Connecting Slack for review pings',
      'Ready — 1 brief in queue',
    ],
    shipped: false,
  },
  {
    id: 'client-onboarding',
    title: 'Client onboarding',
    oneLiner: 'Intake → contract → kickoff — handled end-to-end.',
    integrations: ['gmail', 'google-calendar', 'stripe'],
    minutes: 4,
    systemName: 'Client Onboarding',
    systemColor: '#F7C700',
    workflowName: 'Intake → Contract → Kickoff',
    buildSteps: [
      'Creating System: Client Onboarding',
      'Adding Workflow: Intake → Contract → Kickoff',
      'Connecting Gmail + Calendar + Stripe',
      'Configuring intake template',
      'Ready — waiting for first inquiry',
    ],
    shipped: false,
  },
  {
    id: 'invoice-capture',
    title: 'Invoice + receipt capture',
    oneLiner: 'Incoming receipts auto-categorized and filed.',
    integrations: ['gmail', 'stripe'],
    minutes: 3,
    systemName: 'Bookkeeping',
    systemColor: '#15AD70',
    workflowName: 'Detect receipt → Extract → File',
    buildSteps: [
      'Creating System: Bookkeeping',
      'Adding Workflow: Detect receipt → Extract → File',
      'Scanning Gmail for receipts',
      'Connecting Stripe',
      'Ready — 14 receipts auto-categorized',
    ],
    shipped: false,
  },
  {
    id: 'custom',
    title: 'Custom (advanced)',
    oneLiner: 'Skip the template. Start with one blank System.',
    integrations: [],
    minutes: 1,
    systemName: 'My Workspace',
    systemColor: '#7193ED',
    workflowName: 'Untitled Workflow',
    buildSteps: ['Creating blank System', 'Ready — build from here'],
    shipped: true,
  },
];

export function wedgeById(id: string): Wedge | undefined {
  return WEDGES.find(w => w.id === id);
}

export function shippedWedges(): Wedge[] {
  return WEDGES.filter(w => w.shipped);
}
