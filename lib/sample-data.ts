import { prisma } from '@/lib/db';
import { seedAutonomyConfigs } from '@/lib/seed-autonomy';
import { seedNovaMemories } from '@/lib/seed-nova-memories';
import { seedConsequences } from '@/lib/seed-consequences';
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
  // SIGNALS (inbox)
  // Every tagged with source 'sample' so the DELETE handler can
  // scoop them up cleanly.
  // ------------------------------------------------------------------
  const signalDefs = [
    {
      title: 'Stripe webhook delivery failed',
      body: 'The billing webhook retried 3 times and gave up. Likely endpoint outage — investigate.',
      priority: 'HIGH',
      status: 'UNREAD',
    },
    {
      title: 'Meta Ads campaign reached daily cap',
      body: 'Q2 Launch campaign hit daily spend cap at 2:14pm. Creative is converting — consider lifting cap.',
      priority: 'NORMAL',
      status: 'UNREAD',
    },
    {
      title: 'New client form submitted',
      body: 'Acme Corp submitted the intake form. Nova drafted a reply — review before sending.',
      priority: 'LOW',
      status: 'READ',
    },
  ];
  for (const sig of signalDefs) {
    await prisma.signal.create({
      data: {
        ...sig,
        source: 'sample',
        systemId,
        environmentId,
      },
    });
  }

  // ------------------------------------------------------------------
  // MEETINGS (with transcript + action items)
  // ------------------------------------------------------------------
  const sampleMeeting = await prisma.meeting.create({
    data: {
      title: 'Sample · Weekly growth review',
      description: '[Sample] Weekly sync covering campaigns, pipeline, and priorities.',
      startTime: hoursAgo(48),
      endTime: hoursAgo(47),
      attendees: JSON.stringify(['alex@acme.com', 'jordan@acme.com', 'sam@acme.com']),
      status: 'DONE',
      transcript:
        '**Alex** — Thanks everyone for joining. Let\'s walk through this week\'s growth numbers.\n\n**Jordan** — Campaign performance is up 18% week-over-week. The Meta Ads creative from last Friday is working.\n\n**Sam** — I\'ve drafted a retrospective memo. Want me to share it before Monday?\n\n**Alex** — Yes. Let\'s also queue a follow-up thread in #growth to keep the team aligned.',
      summary:
        '[Sample] Weekly growth is up 18% week-over-week. Sam will share the retrospective before Monday. Alex will queue a follow-up thread in #growth.',
      environmentId,
      creatorId: identityId,
    },
  });
  await prisma.meetingActionItem.createMany({
    data: [
      { meetingId: sampleMeeting.id, text: 'Sam to share the retrospective memo before Monday', order: 0 },
      { meetingId: sampleMeeting.id, text: 'Alex to queue a follow-up thread in #growth', order: 1 },
      { meetingId: sampleMeeting.id, text: 'Schedule a deep-dive on Meta Ads creative', order: 2 },
    ],
  });

  // ------------------------------------------------------------------
  // COURSES (so /learn/courses isn't empty on first visit)
  // ------------------------------------------------------------------
  const sampleCourse = await prisma.course.create({
    data: {
      title: 'Sample · Running a weekly growth review',
      summary: '[Sample] A 3-lesson primer on how Nova thinks about growth ops. Clone and edit to customise for your team.',
      published: true,
      skillTag: 'growth-review',
      environmentId,
      authorId: identityId,
    },
  });
  const sampleModule = await prisma.module.create({
    data: { title: 'The weekly review loop', order: 0, courseId: sampleCourse.id },
  });
  await prisma.lesson.createMany({
    data: [
      {
        moduleId: sampleModule.id,
        order: 0,
        title: 'Why weekly cadence beats daily dashboards',
        body: '[Sample] Daily dashboards are noise. Weekly reviews compress signal into action.\n\nKey moves:\n- Pick 3 metrics you actually act on\n- Write one paragraph on what changed\n- Identify one decision to make next week',
        estimatedMinutes: 6,
      },
      {
        moduleId: sampleModule.id,
        order: 1,
        title: 'Writing a review that produces decisions',
        body: '[Sample] A review is not a report. It is a forcing function for a decision.\n\nTemplate:\n1. What moved\n2. Why it moved\n3. What we\'ll do next week because of it',
        estimatedMinutes: 8,
      },
    ],
  });

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
  // Intentionally NOT seeded for new accounts. Cross-domain insights
  // must be derived from the user's actual data — not pre-populated
  // demo rows. The previous implementation created rows with
  // environmentId=null, which leaked the same mockup insights into
  // every signed-in account's dashboard panel. Real insights flow
  // from POST /api/insights/cross-domain once Nova has analyzed the
  // user's environments. Empty state is correct for new accounts.

  // ------------------------------------------------------------------
  // AUTONOMY CONFIGS (trust gradient)
  // ------------------------------------------------------------------
  await seedAutonomyConfigs(environmentId);

  // ------------------------------------------------------------------
  // NOVA SECOND BRAIN (memories)
  // ------------------------------------------------------------------
  await seedNovaMemories(environmentId);
}
