/**
 * Attention scoring — "what should you care about right now?"
 *
 * This is deliberately NOT a PageRank graph. PageRank needs a dense
 * edge set and converges slowly; with the entity counts in a typical
 * GRID tenant (tens to low hundreds) a weighted-recency heuristic
 * grounded in the schema gives better answers for a tenth of the code.
 *
 * Scoring inputs, per candidate entity:
 *
 *   - recency        (half-life decay on the most recent touch)
 *   - volume         (how many recent events touched it)
 *   - urgency        (unread HIGH/URGENT signals, failed executions,
 *                     at-risk goals, overdue dueDates)
 *
 * Final score is a weighted sum, normalized to 0..100 so the widget
 * can render "attention bars" without a second pass.
 *
 * Candidate entity types:
 *
 *   - signal:      most important, they're explicit asks for attention
 *   - execution:   failed executions are treated as urgent signals
 *   - goal:        at-risk / overdue / deadline-imminent
 *   - system:      rolled-up health < threshold
 *
 * Everything is tenant-scoped on identityId via Environment.ownerId.
 * Never touches other tenants.
 */
import { prisma } from '@/lib/db';

export type AttentionKind = 'signal' | 'execution' | 'goal' | 'system';

export type AttentionItem = {
  id: string;
  kind: AttentionKind;
  title: string;
  subtitle: string;
  href: string;
  score: number;          // 0..100
  reason: string;         // one-line why-it-matters
  environmentName: string;
  environmentColor?: string | null;
  timestamp: string;      // ISO
};

// Tuning knobs. If this ever gets worse, change THESE — not the
// callsites. The weights are tuned so a fresh URGENT signal (score
// ~95) beats an old at-risk goal (~60) beats a recent healthy
// execution (~30). A one-day-old "ok" thing should never climb above
// a current problem.
const HALF_LIFE_HOURS = 12;
const WEIGHT_URGENCY = 0.55;
const WEIGHT_RECENCY = 0.30;
const WEIGHT_VOLUME = 0.15;

function recencyScore(timestamp: Date): number {
  const ageHours = (Date.now() - timestamp.getTime()) / 3_600_000;
  if (ageHours < 0) return 1;
  // Exponential decay: score = 0.5 ^ (age / halfLife)
  return Math.pow(0.5, ageHours / HALF_LIFE_HOURS);
}

function urgencyFromPriority(priority: string, status: string): number {
  if (status !== 'UNREAD') return 0.1;
  switch (priority.toUpperCase()) {
    case 'URGENT':
    case 'CRITICAL':
      return 1.0;
    case 'HIGH':
      return 0.8;
    case 'NORMAL':
      return 0.45;
    default:
      return 0.2;
  }
}

function urgencyFromGoal(status: string, dueDate: Date | null): number {
  let base = 0;
  switch (status) {
    case 'AT_RISK':
      base = 0.85;
      break;
    case 'OFF_TRACK':
      base = 1.0;
      break;
    case 'ON_TRACK':
      base = 0.25;
      break;
    case 'COMPLETED':
      return 0;
    default:
      base = 0.3;
  }
  if (dueDate) {
    const daysOut = (dueDate.getTime() - Date.now()) / 86_400_000;
    if (daysOut < 0) base = Math.min(1, base + 0.2);       // overdue
    else if (daysOut < 3) base = Math.min(1, base + 0.15); // soon
  }
  return base;
}

function combine(urgency: number, recency: number, volume: number): number {
  const raw =
    WEIGHT_URGENCY * urgency +
    WEIGHT_RECENCY * recency +
    WEIGHT_VOLUME * Math.min(1, volume / 5);
  return Math.round(Math.max(0, Math.min(1, raw)) * 100);
}

/**
 * Top-N attention items for the given identity, sorted hottest first.
 *
 * Runs 4 small indexed queries in parallel, scores each candidate in
 * memory, then merges. Total work ~= N_signals + N_exec + N_goals +
 * N_systems for the tenant's recent window — cheap enough for a home
 * page render.
 */
export async function getAttentionItems(
  identityId: string,
  limit = 6
): Promise<AttentionItem[]> {
  const since = new Date(Date.now() - 7 * 86_400_000); // last 7 days

  const [signals, executions, goals, systems] = await Promise.all([
    prisma.signal.findMany({
      where: {
        environment: { ownerId: identityId, deletedAt: null },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        environment: { select: { name: true, color: true, slug: true } },
      },
    }),
    prisma.execution.findMany({
      where: {
        system: {
          environment: { ownerId: identityId, deletedAt: null },
        },
        createdAt: { gte: since },
        status: { in: ['FAILED', 'RUNNING', 'QUEUED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        workflow: { select: { name: true } },
        system: {
          select: {
            name: true,
            environment: { select: { name: true, color: true, slug: true } },
          },
        },
      },
    }),
    prisma.goal.findMany({
      where: {
        environment: { ownerId: identityId, deletedAt: null },
        status: { in: ['AT_RISK', 'OFF_TRACK', 'ON_TRACK'] },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      include: {
        environment: { select: { name: true, color: true, slug: true } },
      },
    }),
    prisma.system.findMany({
      where: {
        environment: { ownerId: identityId, deletedAt: null },
        deletedAt: null,
        healthScore: { lt: 0.6 },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        environment: { select: { name: true, color: true, slug: true } },
      },
    }),
  ]);

  const items: AttentionItem[] = [];

  // Volume buckets for the weak "this thing is active" signal. Keyed
  // by system id because most activity rolls up to a system.
  const systemVolume = new Map<string, number>();
  for (const e of executions) {
    systemVolume.set(e.systemId, (systemVolume.get(e.systemId) ?? 0) + 1);
  }

  for (const s of signals) {
    const recency = recencyScore(s.createdAt);
    const urgency = urgencyFromPriority(s.priority, s.status);
    const volume = 0; // signals stand alone
    items.push({
      id: `signal:${s.id}`,
      kind: 'signal',
      title: s.title,
      subtitle: s.body?.slice(0, 80) ?? s.source,
      href: `/signals?focus=${s.id}`,
      score: combine(urgency, recency, volume),
      reason:
        s.status === 'UNREAD'
          ? `Unread ${s.priority.toLowerCase()} signal`
          : `${s.priority.toLowerCase()} signal`,
      environmentName: s.environment.name,
      environmentColor: s.environment.color,
      timestamp: s.createdAt.toISOString(),
    });
  }

  for (const e of executions) {
    const recency = recencyScore(e.createdAt);
    const urgency =
      e.status === 'FAILED' ? 0.95 : e.status === 'RUNNING' ? 0.35 : 0.45;
    const volume = systemVolume.get(e.systemId) ?? 1;
    // Drop non-failed executions that are stale — nobody cares that a
    // succeeded run happened last Tuesday.
    if (e.status !== 'FAILED' && recency < 0.15) continue;
    items.push({
      id: `execution:${e.id}`,
      kind: 'execution',
      title: e.workflow?.name ?? e.system.name,
      subtitle:
        (e.input?.slice(0, 80) ?? '').trim() ||
        `${e.system.name} — ${e.status.toLowerCase()}`,
      href: `/executions/${e.id}`,
      score: combine(urgency, recency, volume),
      reason:
        e.status === 'FAILED'
          ? 'Execution failed'
          : e.status === 'RUNNING'
          ? 'Running now'
          : 'Queued',
      environmentName: e.system.environment.name,
      environmentColor: e.system.environment.color,
      timestamp: e.createdAt.toISOString(),
    });
  }

  for (const g of goals) {
    const urgency = urgencyFromGoal(g.status, g.dueDate);
    if (urgency < 0.3) continue;
    const recency = recencyScore(g.updatedAt);
    items.push({
      id: `goal:${g.id}`,
      kind: 'goal',
      title: g.title,
      subtitle:
        g.dueDate
          ? `Due ${g.dueDate.toISOString().slice(0, 10)}${g.current ? ` · ${g.current}${g.target ? '/' + g.target : ''}` : ''}`
          : g.current
          ? `${g.current}${g.target ? '/' + g.target : ''}`
          : (g.metric ?? 'Goal'),
      href: `/goals?focus=${g.id}`,
      score: combine(urgency, recency, 0),
      reason:
        g.status === 'OFF_TRACK'
          ? 'Goal off track'
          : g.status === 'AT_RISK'
          ? 'Goal at risk'
          : g.dueDate && g.dueDate.getTime() < Date.now()
          ? 'Goal overdue'
          : 'Goal deadline approaching',
      environmentName: g.environment.name,
      environmentColor: g.environment.color,
      timestamp: g.updatedAt.toISOString(),
    });
  }

  for (const sys of systems) {
    const health = sys.healthScore ?? 0;
    // Map 0..0.6 health window onto 0.4..1.0 urgency.
    const urgency = Math.min(1, 0.4 + (0.6 - health));
    const recency = recencyScore(sys.updatedAt);
    items.push({
      id: `system:${sys.id}`,
      kind: 'system',
      title: sys.name,
      subtitle: `Health ${Math.round(health * 100)}%`,
      href: `/systems/${sys.id}`,
      score: combine(urgency, recency, systemVolume.get(sys.id) ?? 0),
      reason: health < 0.3 ? 'System unhealthy' : 'System degraded',
      environmentName: sys.environment.name,
      environmentColor: sys.environment.color,
      timestamp: sys.updatedAt.toISOString(),
    });
  }

  items.sort((a, b) => b.score - a.score);
  return items.slice(0, limit);
}
