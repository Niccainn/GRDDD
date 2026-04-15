import { prisma } from '@/lib/db';
import { seedAutonomyConfigs } from '@/lib/seed-autonomy';
import { seedNovaMemories } from '@/lib/seed-nova-memories';
import { seedConsequences } from '@/lib/seed-consequences';
import { seedCrossDomainInsights } from '@/lib/seed-cross-domain';
import { seedReflections } from '@/lib/seed-reflections';

/**
 * Creates realistic sample data that teaches users every feature.
 * All items are tagged so they can be cleared with one click.
 * Called after onboarding completes.
 */
export async function createSampleData(
  identityId: string,
  environmentId: string,
  systemId: string,
) {
  const now = new Date();

  // Helper: offset days from now
  const daysFromNow = (days: number) =>
    new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const hoursAgo = (hours: number) =>
    new Date(now.getTime() - hours * 60 * 60 * 1000);

  // Fetch identity name for comment authorName
  const identity = await prisma.identity.findUnique({
    where: { id: identityId },
    select: { name: true },
  });
  const authorName = identity?.name ?? 'You';

  // ------------------------------------------------------------------
  // TASKS
  // ------------------------------------------------------------------
  const taskDefs = [
    {
      title: 'Review Q2 campaign brief',
      description:
        'Sample task — shows how tasks work in GRID. Click to edit, add subtasks, or assign to teammates.',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: daysFromNow(3),
    },
    {
      title: 'Design social media templates',
      description:
        'Tasks can have subtasks, comments, attachments, and time tracking. Try clicking into this one.',
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      dueDate: daysFromNow(5),
    },
    {
      title: 'Write blog post draft',
      description: null,
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      dueDate: null,
    },
    {
      title: 'Client presentation deck',
      description: null,
      status: 'TODO',
      priority: 'URGENT',
      dueDate: daysFromNow(1),
    },
    {
      title: 'Update brand guidelines',
      description: null,
      status: 'BACKLOG',
      priority: 'LOW',
      dueDate: null,
    },
    {
      title: 'Analytics review — March',
      description: null,
      status: 'DONE',
      priority: 'NORMAL',
      dueDate: null,
    },
    {
      title: 'Set up email automation',
      description: null,
      status: 'REVIEW',
      priority: 'HIGH',
      dueDate: null,
    },
    {
      title: 'Competitor analysis report',
      description: null,
      status: 'DONE',
      priority: 'NORMAL',
      dueDate: null,
    },
  ];

  const createdTasks = [];
  for (let i = 0; i < taskDefs.length; i++) {
    const t = taskDefs[i];
    const task = await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        position: i * 1000,
        labels: JSON.stringify(['sample']),
        environmentId,
        systemId,
        creatorId: identityId,
        completedAt: t.status === 'DONE' ? now : null,
      },
    });
    createdTasks.push(task);
  }

  // Subtasks for the first task
  const firstTask = createdTasks[0];
  await prisma.task.create({
    data: {
      title: 'Review copy',
      status: 'DONE',
      priority: 'NORMAL',
      position: 0,
      labels: JSON.stringify(['sample']),
      parentId: firstTask.id,
      environmentId,
      systemId,
      creatorId: identityId,
      completedAt: now,
    },
  });
  await prisma.task.create({
    data: {
      title: 'Review visuals',
      status: 'TODO',
      priority: 'NORMAL',
      position: 1000,
      labels: JSON.stringify(['sample']),
      parentId: firstTask.id,
      environmentId,
      systemId,
      creatorId: identityId,
    },
  });

  // Comment on the first task
  await prisma.taskComment.create({
    data: {
      body: 'This is a sample comment. Comments let your team discuss tasks in context. Try posting one below!',
      taskId: firstTask.id,
      authorId: identityId,
      authorName,
    },
  });

  // ------------------------------------------------------------------
  // GOALS
  // ------------------------------------------------------------------
  const goalDefs = [
    {
      title: 'Grow monthly active users to 10K',
      description: '[Sample] Track your most important metrics as goals. This one shows a healthy on-track goal.',
      metric: 'Monthly Active Users',
      target: '10000',
      current: '6800',
      status: 'ON_TRACK',
      progress: 68,
      dueDate: null,
    },
    {
      title: 'Launch Q2 campaign',
      description: '[Sample] Goals at risk get flagged so you can take action before it\'s too late.',
      metric: 'Campaign Launch',
      target: '1',
      current: '0',
      status: 'AT_RISK',
      progress: 45,
      dueDate: daysFromNow(14),
    },
    {
      title: 'Reduce customer churn below 3%',
      description: '[Sample] Behind goals need attention. Click into any goal to update progress or add notes.',
      metric: 'Churn Rate',
      target: '3%',
      current: '4.2%',
      status: 'BEHIND',
      progress: 30,
      dueDate: null,
    },
  ];

  for (const g of goalDefs) {
    await prisma.goal.create({
      data: {
        title: g.title,
        description: g.description,
        metric: g.metric,
        target: g.target,
        current: g.current,
        status: g.status,
        progress: g.progress,
        dueDate: g.dueDate,
        systemId,
        environmentId,
        creatorId: identityId,
      },
    });
  }

  // ------------------------------------------------------------------
  // WORKFLOWS
  // ------------------------------------------------------------------
  const workflowDefs = [
    {
      name: 'Content Pipeline',
      description:
        '[Sample] A content creation process. Each workflow has stages that represent steps.',
      stages: ['Ideate', 'Draft', 'Review', 'Design', 'Publish'],
    },
    {
      name: 'Client Onboarding',
      description:
        '[Sample] A workflow for new client intake. Workflows help you systematize repeatable processes.',
      stages: ['Intake', 'Discovery', 'Proposal', 'Contract', 'Kickoff'],
    },
  ];

  const createdWorkflows = [];
  for (const w of workflowDefs) {
    const stages = JSON.stringify(
      w.stages.map((name, idx) => ({
        id: `stage-${idx + 1}`,
        name,
        type: idx === 0 ? 'input' : idx === w.stages.length - 1 ? 'output' : 'process',
        config: {},
      })),
    );
    const workflow = await prisma.workflow.create({
      data: {
        name: w.name,
        description: w.description,
        status: 'ACTIVE',
        stages,
        systemId,
        environmentId,
        creatorId: identityId,
      },
    });
    createdWorkflows.push(workflow);
  }

  // ------------------------------------------------------------------
  // EXECUTIONS (make dashboard look alive)
  // ------------------------------------------------------------------
  const executionDefs = [
    {
      status: 'COMPLETED',
      input: 'Blog post: AI in Marketing',
      output: 'Generated 1,200-word article with SEO optimization.',
      completedAt: hoursAgo(2),
    },
    {
      status: 'COMPLETED',
      input: 'Social campaign: Product launch',
      output: 'Created 5 platform-specific posts with hashtag strategy.',
      completedAt: hoursAgo(5),
    },
    {
      status: 'RUNNING',
      input: 'Newsletter: Weekly roundup',
      output: null,
      completedAt: null,
    },
  ];

  for (let i = 0; i < executionDefs.length; i++) {
    const e = executionDefs[i];
    await prisma.execution.create({
      data: {
        status: e.status,
        input: e.input,
        output: e.output,
        completedAt: e.completedAt,
        systemId,
        workflowId: createdWorkflows[i % createdWorkflows.length]?.id,
      },
    });
  }

  // ------------------------------------------------------------------
  // SYSTEM HEALTH
  // ------------------------------------------------------------------
  await prisma.systemState.create({
    data: {
      systemId,
      healthScore: 82,
      activeWorkflows: 2,
      lastActivity: now,
    },
  });

  await prisma.system.update({
    where: { id: systemId },
    data: { healthScore: 82 },
  });

  // ------------------------------------------------------------------
  // NOVA REFLECTIONS
  // ------------------------------------------------------------------
  await seedReflections(environmentId, systemId);

  // ------------------------------------------------------------------
  // CONSEQUENCE LINKS (domino-effect map)
  // ------------------------------------------------------------------
  await seedConsequences(environmentId, systemId);

  // ------------------------------------------------------------------
  // CROSS-DOMAIN INSIGHTS
  // ------------------------------------------------------------------
  await seedCrossDomainInsights();

  // ------------------------------------------------------------------
  // AUTONOMY CONFIGS (trust gradient)
  // ------------------------------------------------------------------
  await seedAutonomyConfigs(environmentId);

  // ------------------------------------------------------------------
  // NOVA SECOND BRAIN (memories)
  // ------------------------------------------------------------------
  await seedNovaMemories(environmentId);
}
