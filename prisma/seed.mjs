import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Return a Date offset from now by the given number of hours. */
const hoursAgo = (h) => new Date(Date.now() - h * 3600_000);
const daysAgo  = (d) => new Date(Date.now() - d * 86_400_000);

async function seed() {
  console.log('Cleaning database...');

  // Delete in dependency order
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.signal.deleteMany(),
    prisma.goal.deleteMany(),
    prisma.intelligenceLog.deleteMany(),
    prisma.validationResult.deleteMany(),
    prisma.execution.deleteMany(),
    prisma.workflowVersion.deleteMany(),
    prisma.workflow.deleteMany(),
    prisma.systemState.deleteMany(),
    prisma.intelligence.deleteMany(),
    prisma.system.deleteMany(),
    prisma.webhookDelivery.deleteMany(),
    prisma.webhook.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.environmentMembership.deleteMany(),
    prisma.environment.deleteMany(),
    prisma.session.deleteMany(),
    prisma.identity.deleteMany(),
  ]);

  console.log('Seeding database...');

  // ── Identity ───────────────────────────────────────────────────────────────

  const passwordHash = await bcrypt.hash('password123', 10);

  const alex = await prisma.identity.create({
    data: {
      type: 'PERSON',
      name: 'Alex Chen',
      email: 'demo@grid.app',
      passwordHash,
      description: 'Founder & operator. Runs every surface of the business through GRID.',
      avatar: null,
    },
  });
  console.log('  Identity: Alex Chen');

  // ── Environments ───────────────────────────────────────────────────────────

  const envOperations = await prisma.environment.create({
    data: {
      name: 'Operations',
      slug: 'operations',
      description: 'Core business operations — delivery, revenue, and content systems.',
      color: '#15AD70',
      ownerId: alex.id,
      tokenBudget: 500_000,
      tokensUsed: 127_450,
    },
  });

  const envGrowth = await prisma.environment.create({
    data: {
      name: 'Growth',
      slug: 'growth',
      description: 'Marketing, brand, and growth engine.',
      color: '#7193ED',
      ownerId: alex.id,
      tokenBudget: 300_000,
      tokensUsed: 83_200,
    },
  });

  const envProduct = await prisma.environment.create({
    data: {
      name: 'Product',
      slug: 'product',
      description: 'Product development, engineering, and design.',
      color: '#BF9FF1',
      ownerId: alex.id,
      tokenBudget: 400_000,
      tokensUsed: 201_800,
    },
  });

  console.log('  Environments: Operations, Growth, Product');

  // Memberships (Alex is ADMIN in all)
  await prisma.$transaction([
    prisma.environmentMembership.create({ data: { role: 'ADMIN', environmentId: envOperations.id, identityId: alex.id } }),
    prisma.environmentMembership.create({ data: { role: 'ADMIN', environmentId: envGrowth.id, identityId: alex.id } }),
    prisma.environmentMembership.create({ data: { role: 'ADMIN', environmentId: envProduct.id, identityId: alex.id } }),
  ]);

  // ── Systems ────────────────────────────────────────────────────────────────

  const sysContentEngine = await prisma.system.create({
    data: { name: 'Content Engine', description: 'End-to-end content creation, review, and publication.', color: '#7193ED', healthScore: 92, environmentId: envOperations.id, creatorId: alex.id },
  });
  const sysClientDelivery = await prisma.system.create({
    data: { name: 'Client Delivery', description: 'Client onboarding, project management, and success tracking.', color: '#15AD70', healthScore: 87, environmentId: envOperations.id, creatorId: alex.id },
  });
  const sysRevOps = await prisma.system.create({
    data: { name: 'Revenue Operations', description: 'Pipeline, forecasting, and financial operations.', color: '#F7C700', healthScore: 64, environmentId: envOperations.id, creatorId: alex.id },
  });
  const sysMarketing = await prisma.system.create({
    data: { name: 'Marketing System', description: 'Campaign planning, execution, and performance analytics.', color: '#FF6B6B', healthScore: 78, environmentId: envGrowth.id, creatorId: alex.id },
  });
  const sysBrand = await prisma.system.create({
    data: { name: 'Brand System', description: 'Brand identity, guidelines, and asset management.', color: '#BF9FF1', healthScore: 91, environmentId: envGrowth.id, creatorId: alex.id },
  });
  const sysProductDev = await prisma.system.create({
    data: { name: 'Product Development', description: 'Product roadmap, feature planning, and release management.', color: '#7193ED', healthScore: 85, environmentId: envProduct.id, creatorId: alex.id },
  });
  const sysEngineering = await prisma.system.create({
    data: { name: 'Engineering', description: 'Sprint management, CI/CD, and engineering velocity.', color: '#15AD70', healthScore: 73, environmentId: envProduct.id, creatorId: alex.id },
  });
  const sysDesign = await prisma.system.create({
    data: { name: 'Design System', description: 'Component library, design tokens, and UI consistency.', color: '#F7C700', healthScore: 95, environmentId: envProduct.id, creatorId: alex.id },
  });

  console.log('  Systems: 8 created');

  // ── Workflows ──────────────────────────────────────────────────────────────

  const wfBlog = await prisma.workflow.create({
    data: {
      name: 'Blog Post Pipeline',
      description: 'End-to-end blog content creation and publication.',
      status: 'ACTIVE',
      stages: JSON.stringify(['Research', 'Draft', 'Review', 'Publish']),
      systemId: sysContentEngine.id,
      environmentId: envOperations.id,
      creatorId: alex.id,
    },
  });
  const wfOnboarding = await prisma.workflow.create({
    data: {
      name: 'Client Onboarding',
      description: 'Structured onboarding flow from discovery to handoff.',
      status: 'ACTIVE',
      stages: JSON.stringify(['Discovery', 'Setup', 'Training', 'Handoff']),
      systemId: sysClientDelivery.id,
      environmentId: envOperations.id,
      creatorId: alex.id,
    },
  });
  const wfCampaign = await prisma.workflow.create({
    data: {
      name: 'Campaign Launch',
      description: 'Full campaign lifecycle from brief to measurement.',
      status: 'ACTIVE',
      stages: JSON.stringify(['Brief', 'Creative', 'Review', 'Launch', 'Measure']),
      systemId: sysMarketing.id,
      environmentId: envGrowth.id,
      creatorId: alex.id,
    },
  });
  const wfSprint = await prisma.workflow.create({
    data: {
      name: 'Sprint Cycle',
      description: 'Two-week engineering sprint from planning to deploy.',
      status: 'ACTIVE',
      stages: JSON.stringify(['Planning', 'Development', 'Review', 'Deploy']),
      systemId: sysEngineering.id,
      environmentId: envProduct.id,
      creatorId: alex.id,
    },
  });
  const wfDesignReview = await prisma.workflow.create({
    data: {
      name: 'Design Review',
      description: 'Design critique and iteration workflow.',
      status: 'ACTIVE',
      stages: JSON.stringify(['Proposal', 'Critique', 'Iterate', 'Approve']),
      systemId: sysDesign.id,
      environmentId: envProduct.id,
      creatorId: alex.id,
    },
  });
  const wfForecast = await prisma.workflow.create({
    data: {
      name: 'Revenue Forecast',
      description: 'Quarterly revenue forecasting and reporting cycle.',
      status: 'PAUSED',
      stages: JSON.stringify(['Data Collection', 'Analysis', 'Report', 'Present']),
      systemId: sysRevOps.id,
      environmentId: envOperations.id,
      creatorId: alex.id,
    },
  });

  console.log('  Workflows: 6 created');

  // ── Intelligence (Nova per environment) ────────────────────────────────────

  // Each Nova is linked to the first system in its environment
  const novaOps = await prisma.intelligence.create({
    data: { name: 'Nova', type: 'AI_AGENT', isActive: true, description: 'Operational intelligence agent for the Operations environment.', systemId: sysContentEngine.id, environmentId: envOperations.id, creatorId: alex.id },
  });
  const novaGrowth = await prisma.intelligence.create({
    data: { name: 'Nova', type: 'AI_AGENT', isActive: true, description: 'Growth intelligence agent for the Growth environment.', systemId: sysMarketing.id, environmentId: envGrowth.id, creatorId: alex.id },
  });
  const novaProduct = await prisma.intelligence.create({
    data: { name: 'Nova', type: 'AI_AGENT', isActive: true, description: 'Product intelligence agent for the Product environment.', systemId: sysProductDev.id, environmentId: envProduct.id, creatorId: alex.id },
  });

  console.log('  Intelligence: 3 Nova agents');

  // ── Automations (Intelligence type=AUTOMATION) ────────────────────────────

  const nextDaily = new Date(); nextDaily.setDate(nextDaily.getDate() + 1); nextDaily.setHours(9, 0, 0, 0);
  const nextWeekly = new Date(); nextWeekly.setDate(nextWeekly.getDate() + 7); nextWeekly.setHours(9, 0, 0, 0);
  const nextWeekday = new Date(); nextWeekday.setDate(nextWeekday.getDate() + 1);
  while ([0, 6].includes(nextWeekday.getDay())) nextWeekday.setDate(nextWeekday.getDate() + 1);
  nextWeekday.setHours(9, 0, 0, 0);

  const autoContentBrief = await prisma.intelligence.create({
    data: {
      type: 'AUTOMATION',
      name: 'Weekly Content Brief',
      description: 'Runs Every week',
      isActive: true,
      systemId: sysContentEngine.id,
      environmentId: envOperations.id,
      creatorId: alex.id,
      config: JSON.stringify({
        workflowId: wfBlog.id,
        schedule: 'weekly',
        input: 'Generate a weekly content brief: review top-performing posts, identify trending topics in our niche, and draft 3 blog post outlines for next week.',
        nextRun: nextWeekly.toISOString(),
      }),
    },
  });

  const autoClientHealth = await prisma.intelligence.create({
    data: {
      type: 'AUTOMATION',
      name: 'Daily Client Health Check',
      description: 'Runs Every day',
      isActive: true,
      systemId: sysClientDelivery.id,
      environmentId: envOperations.id,
      creatorId: alex.id,
      config: JSON.stringify({
        workflowId: null,
        schedule: 'daily',
        input: 'Scan all active client accounts for risk signals: check login activity, open support tickets, and usage trends. Flag any account with declining engagement.',
        nextRun: nextDaily.toISOString(),
      }),
    },
  });

  const autoSprintReport = await prisma.intelligence.create({
    data: {
      type: 'AUTOMATION',
      name: 'Sprint Progress Report',
      description: 'Runs Weekdays (Mon-Fri)',
      isActive: false,
      systemId: sysEngineering.id,
      environmentId: envProduct.id,
      creatorId: alex.id,
      config: JSON.stringify({
        workflowId: wfSprint.id,
        schedule: 'weekdays',
        input: 'Compile a sprint progress summary: completed story points, remaining work, blockers, and velocity trend. Post to #engineering channel.',
        nextRun: nextWeekday.toISOString(),
      }),
    },
  });

  // Add automation_run logs so history shows up
  await prisma.$transaction([
    prisma.intelligenceLog.create({ data: {
      action: 'automation_run', input: 'Weekly content brief generation', output: 'Generated 3 blog outlines: AI ops trends, workflow automation guide, client success metrics deep-dive.', tokens: 2200, success: true, createdAt: daysAgo(3), intelligenceId: autoContentBrief.id, systemId: sysContentEngine.id, identityId: alex.id,
    }}),
    prisma.intelligenceLog.create({ data: {
      action: 'automation_run', input: 'Daily client health scan', output: 'Scanned 12 accounts. 2 flagged: Meridian Corp (no login 14d), Cascade Digital (usage -60% MoM). Alerts sent.', tokens: 1600, success: true, createdAt: hoursAgo(15), intelligenceId: autoClientHealth.id, systemId: sysClientDelivery.id, identityId: alex.id,
    }}),
    prisma.intelligenceLog.create({ data: {
      action: 'automation_run', input: 'Sprint progress report', output: 'Sprint 14 report: 28/40 points completed, 3 blockers identified, velocity trending down 12%.', tokens: 1400, success: false, createdAt: daysAgo(5), intelligenceId: autoSprintReport.id, systemId: sysEngineering.id, identityId: alex.id,
    }}),
  ]);

  console.log('  Automations: 3 created (2 active, 1 paused)');

  // ── Executions ─────────────────────────────────────────────────────────────

  await prisma.$transaction([
    prisma.execution.create({ data: {
      status: 'COMPLETED', input: 'Generate Q2 content calendar', output: 'Created 12-week content calendar with 36 posts across blog, social, and newsletter channels.', currentStage: 3, completedAt: hoursAgo(4), createdAt: hoursAgo(6), systemId: sysContentEngine.id, workflowId: wfBlog.id,
    }}),
    prisma.execution.create({ data: {
      status: 'COMPLETED', input: 'Draft SEO brief for "operational intelligence" keyword cluster', output: 'SEO brief generated: 8 target keywords, 3 pillar pages, estimated 15K monthly search volume.', currentStage: 3, completedAt: hoursAgo(18), createdAt: hoursAgo(22), systemId: sysContentEngine.id, workflowId: wfBlog.id,
    }}),
    prisma.execution.create({ data: {
      status: 'RUNNING', input: 'Process client intake for Meridian Corp', output: null, currentStage: 1, completedAt: null, createdAt: hoursAgo(2), systemId: sysClientDelivery.id, workflowId: wfOnboarding.id,
    }}),
    prisma.execution.create({ data: {
      status: 'COMPLETED', input: 'Onboard Helios Ventures — full setup and training', output: 'Onboarding complete. 3 users trained, workspace configured, integrations verified.', currentStage: 3, completedAt: daysAgo(2), createdAt: daysAgo(3), systemId: sysClientDelivery.id, workflowId: wfOnboarding.id,
    }}),
    prisma.execution.create({ data: {
      status: 'FAILED', input: 'Sync revenue data from Stripe for March', output: 'Error: Stripe API rate limit exceeded after 2,400 invoice fetches. Partial sync saved.', currentStage: 0, completedAt: null, createdAt: daysAgo(1), systemId: sysRevOps.id, workflowId: wfForecast.id,
    }}),
    prisma.execution.create({ data: {
      status: 'COMPLETED', input: 'Analyze campaign ROI for spring launch', output: 'Spring campaign achieved 3.2x ROAS. Top channel: LinkedIn ads (4.1x). Email underperformed at 1.8x.', currentStage: 4, completedAt: daysAgo(1), createdAt: daysAgo(2), systemId: sysMarketing.id, workflowId: wfCampaign.id,
    }}),
    prisma.execution.create({ data: {
      status: 'RUNNING', input: 'Build landing page for Q3 product launch', output: null, currentStage: 1, completedAt: null, createdAt: hoursAgo(8), systemId: sysMarketing.id, workflowId: wfCampaign.id,
    }}),
    prisma.execution.create({ data: {
      status: 'COMPLETED', input: 'Sprint 14 — deploy auth refactor and billing updates', output: 'Deployed 14 PRs. Auth refactor live. Billing webhook migration complete. Zero rollbacks.', currentStage: 3, completedAt: daysAgo(1), createdAt: daysAgo(3), systemId: sysEngineering.id, workflowId: wfSprint.id,
    }}),
    prisma.execution.create({ data: {
      status: 'RUNNING', input: 'Sprint 15 — API v2 endpoints and rate limiting', output: null, currentStage: 1, completedAt: null, createdAt: hoursAgo(12), systemId: sysEngineering.id, workflowId: wfSprint.id,
    }}),
    prisma.execution.create({ data: {
      status: 'COMPLETED', input: 'Design review: new dashboard card components', output: 'Approved with minor revisions. Updated spacing tokens, added dark mode variants.', currentStage: 3, completedAt: hoursAgo(30), createdAt: daysAgo(2), systemId: sysDesign.id, workflowId: wfDesignReview.id,
    }}),
    prisma.execution.create({ data: {
      status: 'RUNNING', input: 'Design review: notification system redesign', output: null, currentStage: 1, completedAt: null, createdAt: hoursAgo(5), systemId: sysDesign.id, workflowId: wfDesignReview.id,
    }}),
    prisma.execution.create({ data: {
      status: 'COMPLETED', input: 'Update brand color palette for accessibility compliance', output: 'All primary and secondary colors now meet WCAG AA contrast ratios. 4 colors adjusted.', currentStage: 3, completedAt: daysAgo(3), createdAt: daysAgo(4), systemId: sysBrand.id,
    }}),
  ]);

  console.log('  Executions: 12 created');

  // ── Intelligence Logs ──────────────────────────────────────────────────────

  await prisma.$transaction([
    prisma.intelligenceLog.create({ data: {
      action: 'nova_query', input: "What's the bottleneck in Client Delivery?", output: 'The Training stage is the primary bottleneck, averaging 4.2 days versus a 2-day target. Two clients are currently stalled waiting for scheduled training sessions. Recommend pre-recording onboarding modules to reduce dependency on live sessions.', tokens: 1840, success: true, createdAt: hoursAgo(3), intelligenceId: novaOps.id, systemId: sysClientDelivery.id, identityId: alex.id,
    }}),
    prisma.intelligenceLog.create({ data: {
      action: 'nova_query', input: "Summarize this week's content performance", output: 'Published 4 blog posts this week. Total views: 12,340 (+18% WoW). Top performer: "Building Operational Intelligence" with 4,200 views and 320 shares. Newsletter open rate held steady at 42%.', tokens: 1250, success: true, createdAt: daysAgo(1), intelligenceId: novaOps.id, systemId: sysContentEngine.id, identityId: alex.id,
    }}),
    prisma.intelligenceLog.create({ data: {
      action: 'nova_query', input: 'Which campaigns are underperforming?', output: 'The "Developer Toolkit" email campaign is significantly underperforming with a 12% open rate (vs 38% benchmark). The Google Ads retargeting campaign has a 0.8x ROAS, below the 2x threshold. Recommend pausing both and reallocating budget to LinkedIn.', tokens: 2100, success: true, createdAt: daysAgo(2), intelligenceId: novaGrowth.id, systemId: sysMarketing.id, identityId: alex.id,
    }}),
    prisma.intelligenceLog.create({ data: {
      action: 'nova_query', input: 'What is our current ARR trajectory?', output: 'Current ARR is $1.42M, growing at 8.3% MoM. At this rate, you will hit $1.8M by end of Q2 but miss the $2M target by approximately $120K. Pipeline has $340K in late-stage opportunities that could close the gap.', tokens: 1680, success: true, createdAt: daysAgo(3), intelligenceId: novaOps.id, systemId: sysRevOps.id, identityId: alex.id,
    }}),
    prisma.intelligenceLog.create({ data: {
      action: 'nova_query', input: 'Show sprint velocity trend for last 4 sprints', output: 'Sprint velocity has declined from 42 points (Sprint 11) to 34 points (Sprint 14), a 19% drop. Primary cause: increased context-switching due to support escalations. Engineering is spending 22% of capacity on unplanned work.', tokens: 1920, success: true, createdAt: daysAgo(4), intelligenceId: novaProduct.id, systemId: sysEngineering.id, identityId: alex.id,
    }}),
    prisma.intelligenceLog.create({ data: {
      action: 'nova_query', input: 'How close is the design system to full coverage?', output: 'Design system covers 72% of production components. 18 components remain undocumented: 6 in the dashboard module, 5 in settings, and 7 in the onboarding flow. At current pace, full coverage is achievable by end of Q3.', tokens: 1450, success: true, createdAt: daysAgo(5), intelligenceId: novaProduct.id, systemId: sysDesign.id, identityId: alex.id,
    }}),
    prisma.intelligenceLog.create({ data: {
      action: 'nova_query', input: 'Draft a brief for the Q3 brand refresh campaign', output: 'Brief drafted. Objectives: increase brand recall 25%, refresh visual identity for enterprise positioning. Key deliverables: updated brand guidelines, new hero imagery, refreshed pitch deck. Timeline: 6 weeks. Budget estimate: $18K.', tokens: 2800, success: true, createdAt: daysAgo(8), intelligenceId: novaGrowth.id, systemId: sysBrand.id, identityId: alex.id,
    }}),
    prisma.intelligenceLog.create({ data: {
      action: 'nova_query', input: 'Identify at-risk client accounts', output: 'Two accounts flagged: Meridian Corp (no login in 14 days, support ticket unresolved) and Cascade Digital (usage dropped 60% MoM). Recommend proactive outreach to both within 48 hours.', tokens: 1100, success: true, createdAt: daysAgo(10), intelligenceId: novaOps.id, systemId: sysClientDelivery.id, identityId: alex.id,
    }}),
    prisma.intelligenceLog.create({ data: {
      action: 'nova_query', input: 'Compare feature adoption rates for v1.8 release', output: 'Top adopted: workflow automation (68% of active users within 7 days). Lowest: API webhooks (11%). The new dashboard widgets sit at 34%. Recommend in-app onboarding tour for webhooks and widgets.', tokens: 2350, success: true, createdAt: daysAgo(12), intelligenceId: novaProduct.id, systemId: sysProductDev.id, identityId: alex.id,
    }}),
  ]);

  console.log('  IntelligenceLogs: 9 created');

  // ── Goals ──────────────────────────────────────────────────────────────────

  await prisma.$transaction([
    prisma.goal.create({ data: {
      title: 'Increase content output 40%', description: 'Scale from 8 to 12 posts per month across blog, newsletter, and social.', metric: 'posts_per_month', target: '12', current: '10', status: 'ON_TRACK', progress: 65, dueDate: daysAgo(-60), systemId: sysContentEngine.id, environmentId: envOperations.id, creatorId: alex.id,
    }}),
    prisma.goal.create({ data: {
      title: 'Reduce client onboarding time to 5 days', description: 'Streamline onboarding from current 8-day average to 5 days or less.', metric: 'avg_onboarding_days', target: '5', current: '5.8', status: 'ON_TRACK', progress: 80, dueDate: daysAgo(-30), systemId: sysClientDelivery.id, environmentId: envOperations.id, creatorId: alex.id,
    }}),
    prisma.goal.create({ data: {
      title: 'Hit $2M ARR', description: 'Reach $2M annual recurring revenue by end of Q2.', metric: 'arr_usd', target: '2000000', current: '1420000', status: 'AT_RISK', progress: 45, dueDate: daysAgo(-45), systemId: sysRevOps.id, environmentId: envOperations.id, creatorId: alex.id,
    }}),
    prisma.goal.create({ data: {
      title: 'Launch 3 campaigns per quarter', description: 'Maintain a cadence of at least 3 full campaigns each quarter.', metric: 'campaigns_per_quarter', target: '3', current: '3', status: 'ON_TRACK', progress: 90, dueDate: daysAgo(-20), systemId: sysMarketing.id, environmentId: envGrowth.id, creatorId: alex.id,
    }}),
    prisma.goal.create({ data: {
      title: 'Ship v2.0 by Q3', description: 'Complete and launch v2.0 including API v2, new dashboard, and workflow automation.', metric: 'release_milestone', target: 'v2.0', current: 'v1.9-beta', status: 'ON_TRACK', progress: 35, dueDate: daysAgo(-120), systemId: sysProductDev.id, environmentId: envProduct.id, creatorId: alex.id,
    }}),
    prisma.goal.create({ data: {
      title: 'Design system coverage 100%', description: 'Document and standardize all production UI components in the design system.', metric: 'component_coverage_pct', target: '100', current: '72', status: 'ON_TRACK', progress: 72, dueDate: daysAgo(-90), systemId: sysDesign.id, environmentId: envProduct.id, creatorId: alex.id,
    }}),
  ]);

  console.log('  Goals: 6 created');

  // ── Signals ────────────────────────────────────────────────────────────────

  await prisma.$transaction([
    prisma.signal.create({ data: {
      title: 'Slack: Client Meridian requesting status update', body: 'Meridian Corp PM posted in #client-meridian asking for a project timeline update. Last activity was 5 days ago.', source: 'slack', sourceRef: 'slack://C04MERIDIAN/p1712345678', priority: 'URGENT', status: 'UNREAD', createdAt: hoursAgo(1), systemId: sysClientDelivery.id, environmentId: envOperations.id,
    }}),
    prisma.signal.create({ data: {
      title: 'GitHub: PR #247 needs review — auth refactor', body: 'Pull request #247 has been open for 3 days with no reviewers assigned. Changes affect authentication middleware and session handling.', source: 'github', sourceRef: 'github://grid-app/grid/pull/247', priority: 'HIGH', status: 'UNREAD', createdAt: hoursAgo(3), systemId: sysEngineering.id, environmentId: envProduct.id,
    }}),
    prisma.signal.create({ data: {
      title: 'Email: Q2 budget approval needed', body: 'Finance team requesting sign-off on Q2 marketing and engineering budgets by end of week. Total: $142K.', source: 'email', sourceRef: 'email://msg-2024-q2-budget', priority: 'HIGH', status: 'UNREAD', createdAt: hoursAgo(5), systemId: sysRevOps.id, environmentId: envOperations.id,
    }}),
    prisma.signal.create({ data: {
      title: 'Linear: Sprint velocity dropped 15%', body: 'Sprint 14 completed with 34 points versus 40-point target. Unplanned support work consumed 22% of engineering capacity.', source: 'linear', sourceRef: 'linear://team-eng/sprint-14', priority: 'NORMAL', status: 'TRIAGED', createdAt: daysAgo(1), systemId: sysEngineering.id, environmentId: envProduct.id, novaTriaged: true, novaRouting: 'Flagged for sprint retrospective. Recommend capacity planning adjustment.',
    }}),
    prisma.signal.create({ data: {
      title: 'Notion: Brand guidelines doc updated', body: 'Brand guidelines v2.3 published with updated color palette and typography scale for accessibility compliance.', source: 'notion', sourceRef: 'notion://brand-guidelines-v2-3', priority: 'NORMAL', status: 'READ', createdAt: daysAgo(2), systemId: sysBrand.id, environmentId: envGrowth.id,
    }}),
    prisma.signal.create({ data: {
      title: "Webhook: Campaign 'Spring Launch' hit 10k impressions", body: 'Spring Launch campaign crossed 10,000 impressions milestone. Current CTR: 2.8%. Conversion rate: 1.4%.', source: 'webhook', sourceRef: 'webhook://campaign-spring-launch-10k', priority: 'NORMAL', status: 'READ', createdAt: daysAgo(2), systemId: sysMarketing.id, environmentId: envGrowth.id,
    }}),
    prisma.signal.create({ data: {
      title: 'Slack: Design review meeting moved to Thursday', body: 'Weekly design review rescheduled from Wednesday 2pm to Thursday 10am due to team availability.', source: 'slack', sourceRef: 'slack://C04DESIGN/p1712567890', priority: 'NORMAL', status: 'READ', createdAt: daysAgo(3), systemId: sysDesign.id, environmentId: envProduct.id,
    }}),
    prisma.signal.create({ data: {
      title: 'Email: New partnership inquiry from Acme Corp', body: 'Acme Corp VP of Engineering reached out about potential integration partnership. They have 2,000+ employees and use similar tooling.', source: 'email', sourceRef: 'email://msg-acme-partnership', priority: 'HIGH', status: 'UNREAD', createdAt: hoursAgo(8), systemId: sysRevOps.id, environmentId: envOperations.id,
    }}),
    prisma.signal.create({ data: {
      title: 'GitHub: CI pipeline failing on main branch', body: 'Build #1847 failed on main. 3 test suites affected by auth refactor merge. Blocking deployment.', source: 'github', sourceRef: 'github://grid-app/grid/actions/runs/1847', priority: 'URGENT', status: 'UNREAD', createdAt: hoursAgo(1.5), systemId: sysEngineering.id, environmentId: envProduct.id,
    }}),
    prisma.signal.create({ data: {
      title: 'Slack: Content team requesting editorial calendar access', body: 'Two new contractors need access to the editorial calendar and content management workspace.', source: 'slack', sourceRef: 'slack://C04CONTENT/p1712678901', priority: 'NORMAL', status: 'TRIAGED', createdAt: daysAgo(1), systemId: sysContentEngine.id, environmentId: envOperations.id, novaTriaged: true, novaRouting: 'Routed to workspace admin. Recommend granting Contributor role.',
    }}),
  ]);

  console.log('  Signals: 10 created');

  // ── Audit Log ──────────────────────────────────────────────────────────────

  await prisma.$transaction([
    prisma.auditLog.create({ data: {
      action: 'created', entity: 'workflow', entityName: 'Blog Post Pipeline', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envOperations.id, environmentName: 'Operations', createdAt: daysAgo(6),
    }}),
    prisma.auditLog.create({ data: {
      action: 'created', entity: 'workflow', entityName: 'Client Onboarding', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envOperations.id, environmentName: 'Operations', createdAt: daysAgo(6),
    }}),
    prisma.auditLog.create({ data: {
      action: 'executed', entity: 'execution', entityName: 'Generate Q2 content calendar', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envOperations.id, environmentName: 'Operations', createdAt: hoursAgo(6),
    }}),
    prisma.auditLog.create({ data: {
      action: 'queried_nova', entity: 'intelligence', entityName: 'Nova', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envOperations.id, environmentName: 'Operations', metadata: JSON.stringify({ query: "What's the bottleneck in Client Delivery?" }), createdAt: hoursAgo(3),
    }}),
    prisma.auditLog.create({ data: {
      action: 'updated', entity: 'system', entityName: 'Revenue Operations', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envOperations.id, environmentName: 'Operations', metadata: JSON.stringify({ field: 'healthScore', from: 71, to: 64 }), createdAt: daysAgo(1),
    }}),
    prisma.auditLog.create({ data: {
      action: 'executed', entity: 'execution', entityName: 'Analyze campaign ROI for spring launch', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envGrowth.id, environmentName: 'Growth', createdAt: daysAgo(2),
    }}),
    prisma.auditLog.create({ data: {
      action: 'queried_nova', entity: 'intelligence', entityName: 'Nova', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envGrowth.id, environmentName: 'Growth', metadata: JSON.stringify({ query: 'Which campaigns are underperforming?' }), createdAt: daysAgo(2),
    }}),
    prisma.auditLog.create({ data: {
      action: 'created', entity: 'workflow', entityName: 'Sprint Cycle', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envProduct.id, environmentName: 'Product', createdAt: daysAgo(5),
    }}),
    prisma.auditLog.create({ data: {
      action: 'executed', entity: 'execution', entityName: 'Sprint 14 — deploy auth refactor and billing updates', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envProduct.id, environmentName: 'Product', createdAt: daysAgo(3),
    }}),
    prisma.auditLog.create({ data: {
      action: 'queried_nova', entity: 'intelligence', entityName: 'Nova', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envProduct.id, environmentName: 'Product', metadata: JSON.stringify({ query: 'Show sprint velocity trend for last 4 sprints' }), createdAt: daysAgo(4),
    }}),
    prisma.auditLog.create({ data: {
      action: 'updated', entity: 'workflow', entityName: 'Revenue Forecast', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envOperations.id, environmentName: 'Operations', metadata: JSON.stringify({ field: 'status', from: 'ACTIVE', to: 'PAUSED' }), createdAt: daysAgo(1),
    }}),
    prisma.auditLog.create({ data: {
      action: 'executed', entity: 'execution', entityName: 'Process client intake for Meridian Corp', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envOperations.id, environmentName: 'Operations', createdAt: hoursAgo(2),
    }}),
    prisma.auditLog.create({ data: {
      action: 'created', entity: 'system', entityName: 'Design System', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envProduct.id, environmentName: 'Product', createdAt: daysAgo(7),
    }}),
    prisma.auditLog.create({ data: {
      action: 'queried_nova', entity: 'intelligence', entityName: 'Nova', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envOperations.id, environmentName: 'Operations', metadata: JSON.stringify({ query: 'What is our current ARR trajectory?' }), createdAt: daysAgo(3),
    }}),
    prisma.auditLog.create({ data: {
      action: 'updated', entity: 'system', entityName: 'Engineering', actorId: alex.id, actorName: 'Alex Chen', actorType: 'PERSON', environmentId: envProduct.id, environmentName: 'Product', metadata: JSON.stringify({ field: 'healthScore', from: 78, to: 73 }), createdAt: daysAgo(2),
    }}),
  ]);

  console.log('  AuditLog: 15 created');

  // ── Done ───────────────────────────────────────────────────────────────────

  console.log('\nSeed complete. Login: demo@grid.app / password123');
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
