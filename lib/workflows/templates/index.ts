/**
 * Built-in workflow templates.
 *
 * Every template is a validated WorkflowSpec and is designed around
 * ONE of the highest-signal problems knowledge workers hit every day:
 *
 *   - standup         → "Nobody knows what anyone is doing"
 *   - onboarding      → "New customers fall through the cracks"
 *   - weekly-report   → "Leadership is flying blind until Friday"
 *   - content-loop    → "Ideas die between draft and publish"
 *   - problem-radar   → "We only find issues after they hurt"  ← synergy loop
 *
 * The `problem-radar` template is the synergy primitive: it asks Nova
 * to scan recent activity for friction, surface it as a prioritized
 * list, capture the human's response via record_memory, and learn from
 * every resolution — closing the human↔AGI loop so the system gets
 * smarter every time a real person weighs in.
 */

import { parseSpec, type WorkflowSpec } from '../spec';
import { standupTemplate } from './standup';
import { onboardingTemplate } from './onboarding';
import { weeklyReportTemplate } from './weekly-report';
import { contentLoopTemplate } from './content-loop';
import { problemRadarTemplate } from './problem-radar';

const raw = [
  standupTemplate,
  onboardingTemplate,
  weeklyReportTemplate,
  contentLoopTemplate,
  problemRadarTemplate,
];

// Validate at module load — any broken template crashes boot loudly.
export const templates: WorkflowSpec[] = raw.map((t) => parseSpec(t));
