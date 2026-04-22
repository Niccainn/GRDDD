/**
 * Project templates — named starting points that skip the
 * free-text planning step.
 *
 * Each template carries:
 *   - id       a URL-safe slug
 *   - title    shown on the launcher
 *   - subtitle short description
 *   - goal     the natural-language goal that seeds the planner
 *   - badge    department tag (for coloring)
 *
 * Using a template feels identical to typing the goal — it just
 * skips the typing. Nova still plans the steps from the skill
 * registry and still respects HITL gates.
 */

export type ProjectTemplate = {
  id: string;
  title: string;
  subtitle: string;
  goal: string;
  badge: 'design' | 'marketing' | 'operations' | 'brand' | 'finance' | 'development';
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'brand-identity-kit',
    title: 'Brand identity kit',
    subtitle: 'Logo explorations → approved logo → asset library',
    goal: 'Design a full brand identity kit — logo explorations in Figma, human review, exports, and an asset library in Notion.',
    badge: 'brand',
  },
  {
    id: 'meta-ad-campaign',
    title: 'Meta ad campaign',
    subtitle: 'Brief → creative → campaign draft → approval email',
    goal: 'Design a Meta ad campaign — three copy variants, on-brand creative in Canva, drafted campaign with review gate, and a summary email for final sign-off.',
    badge: 'marketing',
  },
  {
    id: 'client-onboarding',
    title: 'Client onboarding',
    subtitle: 'Intake → kickoff → welcome',
    goal: 'Onboard a new client end-to-end — summarize intake, create a Notion project page, draft a kickoff invite, review, and send a kickoff email.',
    badge: 'operations',
  },
  {
    id: 'weekly-content',
    title: 'Weekly content pipeline',
    subtitle: 'Brief → drafts → scheduled posts',
    goal: 'Run a weekly content pipeline — brief from Notion, three draft variants, human review, scheduled posts with approval gate.',
    badge: 'marketing',
  },
  {
    id: 'launch-announcement',
    title: 'Launch announcement',
    subtitle: 'Write → design → review → publish',
    goal: 'Write, design, and ship a product launch announcement — draft copy, Canva creative, human review, email to users and a Slack post.',
    badge: 'marketing',
  },
  {
    id: 'quarterly-report',
    title: 'Quarterly report',
    subtitle: 'Pull numbers → write narrative → review',
    goal: 'Assemble the quarterly report — pull the numbers from Notion, draft an executive narrative, human review, and save to the leadership library.',
    badge: 'operations',
  },
];

export function findTemplate(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find(t => t.id === id);
}
