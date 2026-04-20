#!/usr/bin/env node
/**
 * Seeds a realistic marketing demo account into the running database, then
 * prints the session token that Chrome can use to render live-app screenshots.
 *
 *   node scripts/seed-marketing-demo.mjs
 *
 * Idempotent: re-running wipes the demo user + all its data and recreates it,
 * so re-runs produce identical screenshots. The demo user email is fixed at
 * demo+marketing@grddd.com and lives in its own Environment — it never
 * touches real users.
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo+marketing@grddd.com';
const DEMO_NAME  = 'Nicole Cain';

function cuid() {
  return 'c' + randomBytes(12).toString('hex');
}

function sessionToken() {
  return randomBytes(32).toString('hex');
}

async function hashPw(pw) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// --- Clean prior demo run --------------------------------------------------
async function clean() {
  const existing = await prisma.identity.findFirst({
    where: { email: DEMO_EMAIL },
  });
  if (!existing) return;
  // Cascade via envs owned by this identity
  await prisma.environment.deleteMany({ where: { ownerId: existing.id } });
  await prisma.session.deleteMany({ where: { identityId: existing.id } });
  await prisma.identity.delete({ where: { id: existing.id } });
  console.log('  cleaned previous demo user');
}

// --- Build realistic demo ---------------------------------------------------
async function seed() {
  const passwordHash = await hashPw('DemoOnly!' + randomBytes(8).toString('hex'));

  const identity = await prisma.identity.create({
    data: {
      id: cuid(),
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      type: 'PERSON',
      passwordHash,
      emailVerifiedAt: new Date(),
      onboardedAt: new Date(),
    },
  });
  console.log(`  identity   ${identity.id}`);

  const env = await prisma.environment.create({
    data: {
      id: cuid(),
      name: 'studio-grddd',
      slug: 'studio-grddd-' + randomBytes(3).toString('hex'),
      description: '6-person creative studio · brand identity + packaging',
      color: '#C8F26B',
      ownerId: identity.id,
    },
  });
  console.log(`  env        ${env.id}`);

  // Three systems — the same names used across the brand deck + mockups
  const systems = [];
  const systemDefs = [
    { name: 'Marketing',  color: '#BF9FF1', healthScore: 87 },
    { name: 'Operations', color: '#C8F26B', healthScore: 92 },
    { name: 'Product',    color: '#7193ED', healthScore: 78 },
  ];
  for (const s of systemDefs) {
    const sys = await prisma.system.create({
      data: {
        id: cuid(),
        name: s.name,
        color: s.color,
        healthScore: s.healthScore,
        description: `${s.name} system — generated for marketing demo`,
        environmentId: env.id,
        creatorId: identity.id,
      },
    });
    systems.push(sys);
    console.log(`  system     ${sys.name}`);
  }
  const [marketing, operations, product] = systems;

  // Workflows — each with realistic stage JSON
  const wfDefs = [
    { sys: operations, name: 'Weekly Ops Pulse',    status: 'ACTIVE',   execs: 142, stages: ['Pull Slack activity', 'Cross-check calendar rhythm', 'Reconcile roadmap', 'Draft pulse document', 'Post & attach review'] },
    { sys: operations, name: 'Client intake → brief', status: 'ACTIVE',   execs:  38, stages: ['Parse intake form', 'Draft brief', 'Critic pass', 'Send for approval'] },
    { sys: operations, name: 'Capacity reconcile',  status: 'ACTIVE',   execs:  31, stages: ['Pull Linear cycle', 'Cross-check calendar', 'Flag over-capacity people'] },
    { sys: operations, name: 'Invoice & reconcile', status: 'ACTIVE',   execs:  22, stages: ['Listen for Stripe paid', 'Update retainer sheet', 'Thank-you draft'] },
    { sys: operations, name: 'Retainer renewal',    status: 'PAUSED',   execs:   8, stages: ['Identify 30d-to-renewal clients', 'Draft outreach', 'Schedule send'] },
    { sys: marketing,  name: 'Q4 Campaign Brief',   status: 'ACTIVE',   execs:  12, stages: ['Review brief', 'Draft variants', 'Critic pass', 'Select winner'] },
    { sys: marketing,  name: 'Launch Draft Review', status: 'ACTIVE',   execs:   9, stages: ['Pull draft', 'Voice-match check', 'Flag concerns'] },
    { sys: product,    name: 'Customer Health Scan',status: 'ACTIVE',   execs:   7, stages: ['Aggregate usage', 'Flag declines', 'Draft outreach list'] },
  ];
  const workflows = [];
  for (const w of wfDefs) {
    const wf = await prisma.workflow.create({
      data: {
        id: cuid(),
        name: w.name,
        status: w.status,
        stages: JSON.stringify(w.stages.map((s, i) => ({ id: `stage${i+1}`, name: s }))),
        system:      { connect: { id: w.sys.id } },
        creator:     { connect: { id: identity.id } },
        environment: { connect: { id: env.id } },
      },
    });
    workflows.push({ wf, execs: w.execs });
    console.log(`  workflow   ${wf.name}`);
  }

  // Executions — realistic status mix with timestamps spread across the last week
  const execStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'RUNNING', 'COMPLETED', 'FAILED'];
  const now = Date.now();
  let execCount = 0;
  for (const { wf } of workflows.slice(0, 5)) {
    for (let i = 0; i < 8; i++) {
      const status = execStatuses[i % execStatuses.length];
      const created = new Date(now - (i + 1) * 2 * 60 * 60 * 1000);
      await prisma.execution.create({
        data: {
          id: cuid(),
          status,
          input: `Scheduled run · ${wf.name}`,
          output: status === 'COMPLETED' ? 'Run completed successfully' : null,
          completedAt: status === 'COMPLETED' ? new Date(created.getTime() + 3000) : null,
          createdAt: created,
          system:   { connect: { id: wf.systemId } },
          workflow: { connect: { id: wf.id } },
        },
      });
      execCount++;
    }
  }
  console.log(`  executions ${execCount}`);

  // Signals — the ambient inbox content
  const signalDefs = [
    { title: 'Stripe · $2,400 invoice paid by COBALT Studio',          source: 'stripe',     priority: 'HIGH',   ago: 4  },
    { title: 'Google Calendar · "Brand review with Atlas" moved Fri',   source: 'google_calendar', priority: 'NORMAL', ago: 11 },
    { title: 'Linear · GRD-482 "Ship Q4 brief" marked Done',            source: 'linear',     priority: 'NORMAL', ago: 22 },
    { title: 'Nova · 3 Q4 campaign drafts ready for review',            source: 'nova',       priority: 'HIGH',   ago: 28 },
    { title: 'Slack · #ops · Lea raised a capacity flag for May',       source: 'slack',      priority: 'NORMAL', ago: 41 },
    { title: 'HubSpot · Pipeline Q2 closed $38K (+12% MoM)',            source: 'hubspot',    priority: 'HIGH',   ago: 60 },
    { title: 'Figma · Atlas brand system v2.1 published by Lea',        source: 'figma',      priority: 'NORMAL', ago: 72 },
    { title: 'Notion · Roadmap diff: Q3 milestone auto-updated',        source: 'notion',     priority: 'NORMAL', ago: 95 },
  ];
  for (const s of signalDefs) {
    await prisma.signal.create({
      data: {
        id: cuid(),
        title: s.title,
        source: s.source,
        priority: s.priority,
        status: 'UNREAD',
        createdAt: new Date(now - s.ago * 60 * 1000),
        environment: { connect: { id: env.id } },
        system:      { connect: { id: operations.id } },
      },
    });
  }
  console.log(`  signals    ${signalDefs.length}`);

  // Task — a few in each state to populate /tasks
  const taskStates = ['TODO', 'IN_PROGRESS', 'DONE', 'DONE', 'TODO'];
  const taskTitles = ['Review Atlas brand deck', 'Approve Q4 campaign brief', 'Reconcile April invoices', 'Ship Studio pricing update', 'Draft retro for sprint 18'];
  for (let i = 0; i < taskTitles.length; i++) {
    await prisma.task.create({
      data: {
        id: cuid(),
        title: taskTitles[i],
        status: taskStates[i],
        priority: i < 2 ? 'HIGH' : 'NORMAL',
        environment: { connect: { id: env.id } },
        system:      { connect: { id: operations.id } },
        creator:     { connect: { id: identity.id } },
      },
    });
  }
  console.log(`  tasks      ${taskTitles.length}`);

  // Session for Chrome to use
  const token = sessionToken();
  const session = await prisma.session.create({
    data: {
      id: cuid(),
      token,
      identityId: identity.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  console.log(`  session    ${session.id.slice(0, 10)}…`);

  console.log('');
  console.log('─'.repeat(60));
  console.log('SESSION_TOKEN=' + token);
  console.log('ENVIRONMENT_ID=' + env.id);
  console.log('─'.repeat(60));
}

(async () => {
  console.log('Seeding marketing demo account…');
  try {
    await clean();
    await seed();
  } catch (err) {
    console.error('seed failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
