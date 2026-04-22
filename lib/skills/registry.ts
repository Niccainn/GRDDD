/**
 * Skill registry — Nova's menu of verbs across integrated tools.
 *
 * A skill is (tool, action, description) — the granular unit Claude
 * picks when it plans a Project. Keeping this catalog honest and
 * narrow is half the battle: if it lists a capability that doesn't
 * exist yet, Nova will plan the step, fail silently, and erode
 * trust. Status flags mark what's wired today vs. planned.
 */

import type { ToolSlug } from '../projects/types';

export type Skill = {
  id: string;
  tool: ToolSlug;
  title: string;
  /** One-sentence description of what this skill does, in user-facing language. */
  description: string;
  /** Input schema, described loosely. Used in the planning prompt. */
  inputs: string[];
  /** What the skill produces on success. */
  produces: 'file' | 'link' | 'campaign' | 'document' | 'email' | 'post' | 'none';
  /** Whether this ships today or is on the roadmap. Honest copy. */
  status: 'available' | 'partial' | 'planned';
  /** Should this step default to a HITL approval gate? */
  requiresApprovalByDefault?: boolean;
};

export const SKILLS: Skill[] = [
  // — DESIGN —
  {
    id: 'figma.create_file',
    tool: 'figma',
    title: 'Create a new Figma file',
    description: 'Spins up a named Figma file in the team library.',
    inputs: ['name', 'teamId', 'template?'],
    produces: 'file',
    status: 'planned',
  },
  {
    id: 'figma.create_logo_explorations',
    tool: 'figma',
    title: 'Create logo explorations',
    description: 'Generates N logo variants on separate frames with structured layers.',
    inputs: ['fileId', 'brandName', 'variantCount', 'briefSummary'],
    produces: 'file',
    status: 'planned',
    requiresApprovalByDefault: true,
  },
  {
    id: 'figma.export_asset',
    tool: 'figma',
    title: 'Export an asset',
    description: 'Exports the approved frame as PNG + SVG ready for production.',
    inputs: ['fileId', 'frameId', 'formats'],
    produces: 'file',
    status: 'planned',
  },
  {
    id: 'canva.create_design',
    tool: 'canva',
    title: 'Create a Canva design',
    description: 'Creates a design from a template, fills copy and imagery placeholders.',
    inputs: ['templateId', 'brandKitId', 'copy'],
    produces: 'file',
    status: 'planned',
    requiresApprovalByDefault: true,
  },
  {
    id: 'adobe.create_illustrator_file',
    tool: 'adobe',
    title: 'Create an Illustrator file',
    description: 'Spins up an .ai file with named artboards matching the brief.',
    inputs: ['name', 'artboardSpec'],
    produces: 'file',
    status: 'planned',
  },

  // — MARKETING —
  {
    id: 'meta_ads.draft_campaign',
    tool: 'meta_ads',
    title: 'Draft a Meta ad campaign',
    description: 'Drafts a campaign, ad set, and creative using supplied assets.',
    inputs: ['objective', 'audience', 'budget', 'assetIds'],
    produces: 'campaign',
    status: 'planned',
    requiresApprovalByDefault: true,
  },
  {
    id: 'google_ads.draft_campaign',
    tool: 'google_ads',
    title: 'Draft a Google Ads campaign',
    description: 'Drafts a search or display campaign with ad groups and keywords.',
    inputs: ['objective', 'keywords', 'assetIds'],
    produces: 'campaign',
    status: 'planned',
    requiresApprovalByDefault: true,
  },
  {
    id: 'linkedin_ads.draft_campaign',
    tool: 'linkedin_ads',
    title: 'Draft a LinkedIn ad campaign',
    description: 'Drafts an ad campaign aligned to a firmographic audience.',
    inputs: ['objective', 'audience', 'assetIds'],
    produces: 'campaign',
    status: 'planned',
    requiresApprovalByDefault: true,
  },

  // — KNOWLEDGE / COMMS —
  {
    id: 'notion.create_page',
    tool: 'notion',
    title: 'Create a Notion page',
    description:
      'Creates a page under an accessible parent. Runs against the real Notion API when the integration is connected; falls back to simulated mode with an honest trace otherwise.',
    inputs: ['parent', 'title', 'content'],
    produces: 'document',
    status: 'available',
  },
  {
    id: 'notion.upload_asset',
    tool: 'notion',
    title: 'Upload asset to Notion',
    description: 'Adds a file artifact to a Notion page (e.g. the asset library).',
    inputs: ['pageId', 'artifactId'],
    produces: 'document',
    status: 'partial',
  },
  {
    id: 'gmail.draft_email',
    tool: 'gmail',
    title: 'Draft an email',
    description:
      'Drafts an email into the user\'s Gmail drafts folder. The user reviews in Gmail and hits Send themselves — the draft is saved, never sent.',
    inputs: ['to', 'subject', 'body'],
    produces: 'email',
    status: 'available',
    requiresApprovalByDefault: true,
  },
  {
    id: 'slack.post_message',
    tool: 'slack',
    title: 'Post to Slack',
    description:
      'Posts a message to a channel the bot is a member of. Runs against the real Slack API when connected; picks a sensible default channel (grid / notifications / nova / general) if none is provided.',
    inputs: ['channel?', 'text'],
    produces: 'post',
    status: 'available',
  },
  {
    id: 'google_drive.save_file',
    tool: 'google_drive',
    title: 'Save to Drive',
    description: 'Uploads a file artifact to a Drive folder.',
    inputs: ['folderId', 'artifactId'],
    produces: 'file',
    status: 'partial',
  },

  // — HITL —
  {
    id: 'human.review',
    tool: 'human',
    title: 'Route for human review',
    description: 'Creates an ApprovalRequest and pauses the project until a human decides.',
    inputs: ['reviewerId?', 'note'],
    produces: 'none',
    status: 'available',
    requiresApprovalByDefault: true,
  },

  // — REASONING ONLY —
  {
    id: 'claude.summarize',
    tool: 'claude',
    title: 'Summarize inputs',
    description: 'Pure Claude reasoning — compresses inputs into a memo.',
    inputs: ['text[]'],
    produces: 'document',
    status: 'available',
  },
  {
    id: 'claude.draft_copy',
    tool: 'claude',
    title: 'Draft copy',
    description: 'Writes headlines, body copy, or social captions against the brand voice.',
    inputs: ['brief', 'voiceMemories[]'],
    produces: 'document',
    status: 'available',
  },
];

export function skillsForTool(tool: ToolSlug): Skill[] {
  return SKILLS.filter(s => s.tool === tool);
}

export function findSkill(id: string): Skill | undefined {
  return SKILLS.find(s => s.id === id);
}

/**
 * The planning prompt needs a compact version of the catalog so
 * Claude chooses skill ids that actually exist. Returned as a
 * newline-delimited list.
 */
export function skillMenuForPrompt(): string {
  return SKILLS.map(
    s => `- ${s.id} (${s.tool}) — ${s.description}${s.status !== 'available' ? ` [${s.status}]` : ''}`,
  ).join('\n');
}
