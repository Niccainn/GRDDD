/**
 * Tenant-ownership guards.
 *
 * Every tenant-scoped API route MUST verify that the authenticated
 * identity actually owns the resource they're asking about. Failing
 * that check is the highest-impact bug class in a multi-tenant SaaS —
 * a single missing `where: { ownerId }` filter is a cross-tenant data
 * leak, and the GDPR / contractual fallout from one such incident is
 * disproportionate to the fix effort.
 *
 * The guards in this file exist so route authors write one line
 * instead of three, and so the safe path is also the shorter path.
 *
 * Design rules:
 *   1. Return the full parent row on success so callers don't need a
 *      second fetch (saves a round trip).
 *   2. Throw a Response on failure — the Next.js route handler layer
 *      already catches thrown Responses and returns them verbatim.
 *   3. 404 on not-found AND on wrong-owner — never 403. A 403 leaks
 *      "this id exists, you just can't touch it," which confirms
 *      resource existence to an attacker. 404 reveals nothing.
 *   4. Environment ownership is the single tenant boundary. Everything
 *      else (systems, workflows, goals, signals, executions,
 *      automations, webhooks) lives under an environment, so we
 *      compose from the environment check.
 */

import { prisma } from '../db';

const UNAUTHORIZED = () =>
  new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Assert that `identityId` owns the environment with id `environmentId`.
 * Throws a 404 Response if the environment doesn't exist or belongs to
 * another identity. Returns the environment row on success.
 */
export async function assertOwnsEnvironment(
  environmentId: string,
  identityId: string
) {
  const env = await prisma.environment.findFirst({
    where: { id: environmentId, ownerId: identityId, deletedAt: null },
  });
  if (!env) throw UNAUTHORIZED();
  return env;
}

/**
 * Assert that `identityId` owns the system with id `systemId` via its
 * parent environment. Returns the system row (including its
 * environmentId) on success.
 */
export async function assertOwnsSystem(systemId: string, identityId: string) {
  const system = await prisma.system.findFirst({
    where: {
      id: systemId,
      environment: { ownerId: identityId, deletedAt: null },
    },
  });
  if (!system) throw UNAUTHORIZED();
  return system;
}

/**
 * Assert that `identityId` owns the workflow with id `workflowId`.
 */
export async function assertOwnsWorkflow(workflowId: string, identityId: string) {
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      environment: { ownerId: identityId, deletedAt: null },
    },
  });
  if (!workflow) throw UNAUTHORIZED();
  return workflow;
}

/**
 * Assert that `identityId` owns the goal with id `goalId`. Goals are
 * scoped via their environment's ownerId — using the environment
 * boundary rather than Goal.creatorId because creatorId can belong to
 * a team member who later leaves, while ownership follows the
 * environment.
 */
export async function assertOwnsGoal(goalId: string, identityId: string) {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      environment: { ownerId: identityId, deletedAt: null },
    },
  });
  if (!goal) throw UNAUTHORIZED();
  return goal;
}

/**
 * Assert that `identityId` owns the signal with id `signalId` via its
 * parent environment.
 */
export async function assertOwnsSignal(signalId: string, identityId: string) {
  const signal = await prisma.signal.findFirst({
    where: {
      id: signalId,
      environment: { ownerId: identityId, deletedAt: null },
    },
  });
  if (!signal) throw UNAUTHORIZED();
  return signal;
}

/**
 * Assert that `identityId` owns the execution with id `executionId`
 * via its system's parent environment.
 */
export async function assertOwnsExecution(
  executionId: string,
  identityId: string
) {
  const exec = await prisma.execution.findFirst({
    where: {
      id: executionId,
      system: { environment: { ownerId: identityId, deletedAt: null } },
    },
  });
  if (!exec) throw UNAUTHORIZED();
  return exec;
}

/**
 * Assert that `identityId` owns the intelligence/automation row.
 */
export async function assertOwnsIntelligence(
  intelligenceId: string,
  identityId: string
) {
  const intel = await prisma.intelligence.findFirst({
    where: {
      id: intelligenceId,
      environment: { ownerId: identityId, deletedAt: null },
    },
  });
  if (!intel) throw UNAUTHORIZED();
  return intel;
}

/**
 * Assert that `identityId` owns the API key.
 */
export async function assertOwnsApiKey(apiKeyId: string, identityId: string) {
  const key = await prisma.apiKey.findFirst({
    where: { id: apiKeyId, identityId },
  });
  if (!key) throw UNAUTHORIZED();
  return key;
}

/**
 * Assert that `identityId` owns the webhook via its environment.
 */
export async function assertOwnsWebhook(webhookId: string, identityId: string) {
  const webhook = await prisma.webhook.findFirst({
    where: {
      id: webhookId,
      environment: { ownerId: identityId, deletedAt: null },
    },
  });
  if (!webhook) throw UNAUTHORIZED();
  return webhook;
}

/**
 * Assert that `identityId` owns the budget via its environment.
 */
export async function assertOwnsBudget(budgetId: string, identityId: string) {
  const budget = await prisma.budget.findFirst({
    where: {
      id: budgetId,
      environment: { ownerId: identityId, deletedAt: null },
    },
  });
  if (!budget) throw UNAUTHORIZED();
  return budget;
}

/**
 * Assert that `identityId` owns the expense via its identity field.
 */
export async function assertOwnsExpense(expenseId: string, identityId: string) {
  const expense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      identityId,
    },
  });
  if (!expense) throw UNAUTHORIZED();
  return expense;
}

/**
 * Assert that `identityId` owns the invoice via its environment.
 */
export async function assertOwnsInvoice(invoiceId: string, identityId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      environment: { ownerId: identityId, deletedAt: null },
    },
  });
  if (!invoice) throw UNAUTHORIZED();
  return invoice;
}

/**
 * Shared `where` fragment used by list endpoints to scope findMany
 * calls to the authenticated identity. Prefer composing this with
 * additional filters rather than handrolling every route.
 */
export function ownedBy(identityId: string) {
  return {
    environment: { ownerId: identityId, deletedAt: null },
  };
}

/**
 * Assert that `identityId` can WRITE to the given environment.
 * Write access = owner OR member with ADMIN or CONTRIBUTOR role.
 * VIEWERs are rejected with a 404 (same as not-found, to prevent
 * resource existence leaks).
 *
 * Returns the environment row on success.
 */
export async function assertCanWriteEnvironment(
  environmentId: string,
  identityId: string
) {
  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identityId },
        {
          memberships: {
            some: {
              identityId,
              role: { in: ['ADMIN', 'CONTRIBUTOR'] },
            },
          },
        },
      ],
    },
  });
  if (!env) throw UNAUTHORIZED();
  return env;
}

/**
 * Assert ADMIN-or-better access on the environment. Used for
 * destructive mutations (delete, bulk changes) where CONTRIBUTOR
 * should NOT be sufficient.
 */
export async function assertCanAdminEnvironment(
  environmentId: string,
  identityId: string
) {
  const env = await prisma.environment.findFirst({
    where: {
      id: environmentId,
      deletedAt: null,
      OR: [
        { ownerId: identityId },
        {
          memberships: {
            some: { identityId, role: 'ADMIN' },
          },
        },
      ],
    },
  });
  if (!env) throw UNAUTHORIZED();
  return env;
}

// ─── Child-model WRITE guards ───────────────────────────────────────────
// Mirror the assertCanWriteEnvironment pattern for the four models
// whose mutations need to be open to CONTRIBUTOR+ (not just OWNER).
// Each guard does one `findFirst` that composes the env-access check;
// callers get a 404 (never 403) on insufficient role to avoid leaking
// resource existence.

const WRITE_ROLES = { in: ['ADMIN', 'CONTRIBUTOR'] };
const ADMIN_ROLES = { in: ['ADMIN'] };

export async function assertCanWriteSystem(systemId: string, identityId: string) {
  const system = await prisma.system.findFirst({
    where: {
      id: systemId,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId, role: WRITE_ROLES } } },
        ],
      },
    },
  });
  if (!system) throw UNAUTHORIZED();
  return system;
}

export async function assertCanAdminSystem(systemId: string, identityId: string) {
  const system = await prisma.system.findFirst({
    where: {
      id: systemId,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId, role: ADMIN_ROLES } } },
        ],
      },
    },
  });
  if (!system) throw UNAUTHORIZED();
  return system;
}

export async function assertCanWriteWorkflow(workflowId: string, identityId: string) {
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId, role: WRITE_ROLES } } },
        ],
      },
    },
  });
  if (!workflow) throw UNAUTHORIZED();
  return workflow;
}

export async function assertCanAdminWorkflow(workflowId: string, identityId: string) {
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId, role: ADMIN_ROLES } } },
        ],
      },
    },
  });
  if (!workflow) throw UNAUTHORIZED();
  return workflow;
}

export async function assertCanReadGoal(goalId: string, identityId: string) {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId } } },
        ],
      },
    },
  });
  if (!goal) throw UNAUTHORIZED();
  return goal;
}

export async function assertCanWriteGoal(goalId: string, identityId: string) {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId, role: WRITE_ROLES } } },
        ],
      },
    },
  });
  if (!goal) throw UNAUTHORIZED();
  return goal;
}

export async function assertCanAdminGoal(goalId: string, identityId: string) {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId, role: ADMIN_ROLES } } },
        ],
      },
    },
  });
  if (!goal) throw UNAUTHORIZED();
  return goal;
}

export async function assertCanWriteSignal(signalId: string, identityId: string) {
  const signal = await prisma.signal.findFirst({
    where: {
      id: signalId,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId, role: WRITE_ROLES } } },
        ],
      },
    },
  });
  if (!signal) throw UNAUTHORIZED();
  return signal;
}

export async function assertCanAdminSignal(signalId: string, identityId: string) {
  const signal = await prisma.signal.findFirst({
    where: {
      id: signalId,
      environment: {
        deletedAt: null,
        OR: [
          { ownerId: identityId },
          { memberships: { some: { identityId, role: ADMIN_ROLES } } },
        ],
      },
    },
  });
  if (!signal) throw UNAUTHORIZED();
  return signal;
}

/**
 * Shared `where` fragment for list endpoints that should include
 * resources from environments the identity owns OR is a member of
 * (any role, including VIEWER — read access).
 */
export function accessibleBy(identityId: string) {
  return {
    environment: {
      deletedAt: null,
      OR: [
        { ownerId: identityId },
        { memberships: { some: { identityId } } },
      ],
    },
  };
}
