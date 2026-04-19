/**
 * Template Marketplace Registry
 *
 * Pre-built system + workflow bundles that solve specific business problems.
 * Each template installs: a System, its Workflows (with stages), and an
 * initial Nova memory prompt so the AI immediately understands the context.
 *
 * Templates are code-driven (not DB rows) so they ship with the app and
 * are always up to date. Installation creates real DB records via the
 * /api/templates/install endpoint.
 */

export type WorkflowTemplate = {
  name: string;
  description: string;
  stages: string[];
  status?: string;
};

export type SystemTemplate = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;       // emoji
  color: string;      // hex color for the system dot
  tags: string[];
  difficulty: 'starter' | 'intermediate' | 'advanced';
  estimatedSetup: string; // "2 min", "5 min", etc.
  workflows: WorkflowTemplate[];
  novaMemory: string;  // Initial persistent memory for Nova
  /** Short pitch shown in the marketplace card */
  pitch: string;
};

export type TemplateCategory =
  | 'marketing'
  | 'operations'
  | 'sales'
  | 'product'
  | 'content'
  | 'client-services'
  | 'finance'
  | 'hr';

export const CATEGORY_META: Record<TemplateCategory, { label: string; icon: string; color: string }> = {
  marketing:        { label: 'Marketing',        icon: '📣', color: '#FF6B6B' },
  operations:       { label: 'Operations',       icon: '⚙️', color: '#7193ED' },
  sales:            { label: 'Sales',             icon: '💰', color: '#15AD70' },
  product:          { label: 'Product',           icon: '🧱', color: '#BF9FF1' },
  content:          { label: 'Content',           icon: '✏️', color: '#F7C700' },
  'client-services': { label: 'Client Services',  icon: '🤝', color: '#FF9F43' },
  finance:          { label: 'Finance',           icon: '📊', color: '#1DD1A1' },
  hr:               { label: 'HR & People',       icon: '👥', color: '#EE5A24' },
};

// ─── Template Registry ──────────────────────────────────────────────────────

export const TEMPLATES: SystemTemplate[] = [
  // ── Content ───────────────────────────────────────────────
  {
    id: 'content-engine',
    name: 'Content Engine',
    description: 'End-to-end content production — from ideation through publishing and performance tracking.',
    category: 'content',
    icon: '✏️',
    color: '#F7C700',
    tags: ['blog', 'seo', 'social', 'editorial'],
    difficulty: 'starter',
    estimatedSetup: '2 min',
    pitch: 'Plan, write, and publish content with AI that knows your brand voice.',
    workflows: [
      {
        name: 'Blog Post Pipeline',
        description: 'Research → Draft → Edit → SEO Review → Publish',
        stages: ['Research', 'Draft', 'Edit', 'SEO Review', 'Publish'],
      },
      {
        name: 'Social Media Calendar',
        description: 'Plan and schedule social posts across platforms',
        stages: ['Ideation', 'Copywriting', 'Design Brief', 'Schedule', 'Post'],
      },
      {
        name: 'Newsletter Production',
        description: 'Curate, write, and send weekly newsletters',
        stages: ['Curate Topics', 'Write Sections', 'Review', 'Send'],
      },
    ],
    novaMemory: 'This system manages all content production. Key priorities: maintain consistent brand voice across all channels, optimize for SEO, track content performance metrics (views, engagement, conversions). The editorial calendar should always have 2 weeks of scheduled content.',
  },

  // ── Marketing ─────────────────────────────────────────────
  {
    id: 'campaign-hub',
    name: 'Campaign Hub',
    description: 'Plan, execute, and measure marketing campaigns across channels.',
    category: 'marketing',
    icon: '📣',
    color: '#FF6B6B',
    tags: ['campaigns', 'ads', 'email', 'analytics'],
    difficulty: 'intermediate',
    estimatedSetup: '3 min',
    pitch: 'Launch campaigns faster with AI that tracks performance and suggests optimizations.',
    workflows: [
      {
        name: 'Campaign Launch',
        description: 'Brief → Creative → Review → Launch → Optimize',
        stages: ['Brief', 'Creative Production', 'Stakeholder Review', 'Launch', 'Performance Review'],
      },
      {
        name: 'Ad Creative Pipeline',
        description: 'Generate and test ad variations',
        stages: ['Audience Research', 'Copy Variants', 'Visual Direction', 'A/B Setup', 'Analysis'],
      },
      {
        name: 'Email Sequence Builder',
        description: 'Design and automate email nurture sequences',
        stages: ['Segment Definition', 'Email Drafts', 'Review', 'Automation Setup', 'Monitor'],
      },
    ],
    novaMemory: 'This system runs all marketing campaigns. Track ROAS, CAC, and conversion rates. Always reference brand guidelines when generating creative briefs. Flag campaigns with declining performance for review.',
  },

  // ── Sales ─────────────────────────────────────────────────
  {
    id: 'sales-pipeline',
    name: 'Sales Pipeline',
    description: 'Track leads from first touch to closed deal with automated follow-ups.',
    category: 'sales',
    icon: '💰',
    color: '#15AD70',
    tags: ['crm', 'leads', 'pipeline', 'forecasting'],
    difficulty: 'starter',
    estimatedSetup: '2 min',
    pitch: 'Never lose a lead. AI tracks your pipeline and flags deals that need attention.',
    workflows: [
      {
        name: 'Lead Qualification',
        description: 'Capture → Score → Qualify → Route to sales',
        stages: ['Capture', 'Enrich Data', 'Score', 'Qualify', 'Route'],
      },
      {
        name: 'Deal Pipeline',
        description: 'Track deals from proposal to close',
        stages: ['Discovery', 'Proposal', 'Negotiation', 'Contract', 'Closed'],
      },
      {
        name: 'Follow-up Sequences',
        description: 'Automated outreach for stale opportunities',
        stages: ['Trigger Check', 'Draft Follow-up', 'Send', 'Track Response'],
      },
    ],
    novaMemory: 'This system manages the sales pipeline. Key metrics: conversion rate per stage, average deal velocity, pipeline value by stage. Flag deals idle for more than 7 days. Weekly forecast accuracy should be tracked.',
  },

  // ── Client Services ───────────────────────────────────────
  {
    id: 'client-delivery',
    name: 'Client Delivery',
    description: 'Onboard new clients, manage deliverables, and track satisfaction.',
    category: 'client-services',
    icon: '🤝',
    color: '#FF9F43',
    tags: ['onboarding', 'delivery', 'retention', 'agency'],
    difficulty: 'intermediate',
    estimatedSetup: '3 min',
    pitch: 'Onboard clients in half the time. AI manages handoffs and flags at-risk accounts.',
    workflows: [
      {
        name: 'Client Onboarding',
        description: 'Welcome → Setup → Training → Go-live',
        stages: ['Welcome Pack', 'Account Setup', 'Kickoff Call', 'Training', 'Go-live'],
      },
      {
        name: 'Deliverable Tracking',
        description: 'Track project milestones and deliverables',
        stages: ['Scope', 'In Progress', 'Internal Review', 'Client Review', 'Delivered'],
      },
      {
        name: 'Health Check',
        description: 'Periodic client satisfaction review',
        stages: ['Gather Metrics', 'Sentiment Analysis', 'Report', 'Action Items'],
      },
    ],
    novaMemory: 'This system manages client relationships and delivery. Target: onboard new clients within 5 business days. Monitor NPS and satisfaction signals. Flag clients with declining engagement or overdue deliverables. Always maintain professional, service-oriented communication.',
  },

  // ── Operations ────────────────────────────────────────────
  {
    id: 'ops-command',
    name: 'Operations Command',
    description: 'Central nervous system for daily operations — tasks, reviews, and process health.',
    category: 'operations',
    icon: '⚙️',
    color: '#7193ED',
    tags: ['ops', 'processes', 'reviews', 'standup'],
    difficulty: 'starter',
    estimatedSetup: '2 min',
    pitch: 'Run your business on autopilot. AI monitors processes and surfaces what needs attention.',
    workflows: [
      {
        name: 'Weekly Review',
        description: 'Automated weekly business health assessment',
        stages: ['Collect Metrics', 'Analyze Trends', 'Draft Summary', 'Share Report'],
      },
      {
        name: 'Process Improvement',
        description: 'Identify and fix operational bottlenecks',
        stages: ['Identify Bottleneck', 'Root Cause', 'Propose Fix', 'Implement', 'Measure'],
      },
      {
        name: 'Daily Standup Brief',
        description: 'AI-generated morning briefing for the team',
        stages: ['Scan Updates', 'Compile Brief', 'Distribute'],
      },
    ],
    novaMemory: 'This is the operational command center. Monitor all cross-system health. Surface anomalies proactively. Track: stalled workflows, at-risk goals, unresolved signals. Generate weekly ops summaries with trends and recommendations.',
  },

  // ── Product ───────────────────────────────────────────────
  {
    id: 'product-dev',
    name: 'Product Development',
    description: 'Ship features faster — from discovery through launch and feedback.',
    category: 'product',
    icon: '🧱',
    color: '#BF9FF1',
    tags: ['roadmap', 'sprints', 'features', 'feedback'],
    difficulty: 'intermediate',
    estimatedSetup: '3 min',
    pitch: 'Plan your roadmap, run sprints, and close the loop with user feedback — all AI-assisted.',
    workflows: [
      {
        name: 'Feature Lifecycle',
        description: 'Idea → Spec → Build → Ship → Measure',
        stages: ['Discovery', 'Spec Writing', 'Development', 'QA', 'Launch', 'Measure Impact'],
      },
      {
        name: 'Sprint Cycle',
        description: 'Two-week sprint planning and execution',
        stages: ['Backlog Grooming', 'Sprint Planning', 'In Progress', 'Code Review', 'Done'],
      },
      {
        name: 'User Feedback Loop',
        description: 'Collect, categorize, and act on feedback',
        stages: ['Collect', 'Categorize', 'Prioritize', 'Route to Team', 'Close Loop'],
      },
    ],
    novaMemory: 'This system manages product development. Key focus: ship velocity, bug-to-feature ratio, user feedback sentiment. Sprints run on 2-week cycles. Always connect feature decisions back to user feedback data.',
  },

  // ── Finance ───────────────────────────────────────────────
  {
    id: 'revenue-ops',
    name: 'Revenue Operations',
    description: 'Track revenue, manage forecasts, and automate financial reporting.',
    category: 'finance',
    icon: '📊',
    color: '#1DD1A1',
    tags: ['revenue', 'forecasting', 'reporting', 'budgets'],
    difficulty: 'advanced',
    estimatedSetup: '5 min',
    pitch: 'Real-time revenue visibility. AI forecasts trends and flags anomalies before they become problems.',
    workflows: [
      {
        name: 'Revenue Forecast',
        description: 'Monthly revenue projection and tracking',
        stages: ['Data Collection', 'Model Update', 'Variance Analysis', 'Report'],
      },
      {
        name: 'Invoice Pipeline',
        description: 'Track invoices from creation to payment',
        stages: ['Create Invoice', 'Send', 'Follow Up', 'Payment Received', 'Reconcile'],
      },
      {
        name: 'Budget Review',
        description: 'Quarterly budget vs. actual analysis',
        stages: ['Pull Actuals', 'Compare to Budget', 'Variance Report', 'Adjustment Proposal'],
      },
    ],
    novaMemory: 'This system manages revenue operations and financial health. Track MRR/ARR, burn rate, and cash runway. Flag overdue invoices after 30 days. Monthly forecast accuracy target: ±5%. Always present financial data with context and trend direction.',
  },

  // ── HR ────────────────────────────────────────────────────
  {
    id: 'people-ops',
    name: 'People & Culture',
    description: 'Hiring, onboarding, and team health — keep your people thriving.',
    category: 'hr',
    icon: '👥',
    color: '#EE5A24',
    tags: ['hiring', 'onboarding', 'culture', 'reviews'],
    difficulty: 'intermediate',
    estimatedSetup: '3 min',
    pitch: 'Hire faster, onboard smoother, and keep your team engaged with AI-powered people ops.',
    workflows: [
      {
        name: 'Hiring Pipeline',
        description: 'Source → Screen → Interview → Offer → Onboard',
        stages: ['Sourcing', 'Screening', 'Interview', 'Reference Check', 'Offer', 'Onboard'],
      },
      {
        name: 'Employee Onboarding',
        description: 'New hire setup and 30/60/90 day check-ins',
        stages: ['Pre-boarding', 'Day 1 Setup', 'Week 1 Training', '30-Day Check', '90-Day Review'],
      },
      {
        name: 'Performance Review Cycle',
        description: 'Quarterly review preparation and execution',
        stages: ['Self Assessment', 'Manager Review', 'Calibration', '1:1 Discussion', 'Goals Set'],
      },
    ],
    novaMemory: 'This system manages people operations. Track: open positions and time-to-hire, employee onboarding completion rates, upcoming review cycles. Maintain a supportive, constructive tone in all people-related communications. Flag new hire onboarding that exceeds 2-week target.',
  },
];

/** Look up a single template by ID */
export function getTemplate(id: string): SystemTemplate | undefined {
  return TEMPLATES.find(t => t.id === id);
}

/** Get templates filtered by category */
export function getTemplatesByCategory(category: TemplateCategory): SystemTemplate[] {
  return TEMPLATES.filter(t => t.category === category);
}

/** Get all unique categories that have templates */
export function getCategories(): TemplateCategory[] {
  return [...new Set(TEMPLATES.map(t => t.category))];
}
