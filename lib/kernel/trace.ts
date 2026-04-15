/**
 * Nova Kernel — Trace
 *
 * A Trace is a structured record of a single kernel run: the context,
 * the routing decision, every reasoning step, every tool call, the
 * final output, tokens, cost, and timing.
 *
 * Traces power the observability UI ("why did Nova do that?"), the
 * learning loop (which decisions worked?), and the audit log (who ran
 * what, when, in which tenant).
 *
 * Persisted to the KernelTrace table — a dedicated schema owned by
 * the kernel module so it can evolve independently of legacy
 * intelligence logs.
 */

import { randomUUID } from 'node:crypto';
import { prisma } from '../db';
import { redactTraceRecord, redactString } from './redact';
import type { KernelContext, TraceEvent, KernelResponse, ModelTier } from './types';

export interface TraceRecord {
  traceId: string;
  tenantId: string;
  actorId: string;
  surface: string;
  environmentId?: string;
  systemId?: string;
  tier: ModelTier;
  model: string;
  startedAt: Date;
  endedAt?: Date;
  durationMs: number;
  events: TraceEvent[];
  response?: KernelResponse;
  status: 'running' | 'done' | 'error';
  errorMessage?: string;
}

export class Trace {
  readonly traceId: string;
  readonly startedAt: Date;
  private readonly events: TraceEvent[] = [];
  private ended = false;
  private readonly ctx: KernelContext;
  private tier: ModelTier = 'balanced';
  private model = '';
  private status: 'running' | 'done' | 'error' = 'running';
  private errorMessage?: string;
  private response?: KernelResponse;

  constructor(ctx: KernelContext) {
    this.traceId = randomUUID();
    this.startedAt = new Date();
    this.ctx = ctx;
  }

  setRouting(tier: ModelTier, model: string) {
    this.tier = tier;
    this.model = model;
  }

  emit(event: TraceEvent) {
    if (this.ended) return;
    this.events.push(event);
  }

  fail(message: string, recoverable = false) {
    this.status = 'error';
    this.errorMessage = message;
    this.emit({
      type: 'error',
      message,
      recoverable,
      timestamp: Date.now(),
    });
  }

  complete(response: KernelResponse) {
    this.response = response;
    this.status = 'done';
    this.emit({ type: 'done', response, timestamp: Date.now() });
  }

  get record(): TraceRecord {
    return {
      traceId: this.traceId,
      tenantId: this.ctx.tenantId,
      actorId: this.ctx.actorId,
      surface: this.ctx.surface,
      environmentId: this.ctx.environmentId,
      systemId: this.ctx.systemId,
      tier: this.tier,
      model: this.model,
      startedAt: this.startedAt,
      endedAt: this.ended ? new Date() : undefined,
      durationMs: Date.now() - this.startedAt.getTime(),
      events: this.events,
      response: this.response,
      status: this.status,
      errorMessage: this.errorMessage,
    };
  }

  /**
   * Persist this trace. Fire-and-forget safe — traces must never
   * take down a user request.
   */
  async persist(): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    const record = this.record;

    // Redact PII and secret-shaped tokens before the payload touches
    // the database. This is what the privacy policy promises. See
    // lib/kernel/redact.ts for the pattern library.
    const redacted = redactTraceRecord(record);

    try {
      await prisma.kernelTrace.create({
        data: {
          id: this.traceId,
          tenantId: this.ctx.tenantId,
          actorId: this.ctx.actorId,
          surface: this.ctx.surface,
          environmentId: this.ctx.environmentId ?? null,
          systemId: this.ctx.systemId ?? null,
          tier: this.tier,
          model: this.model,
          status: this.status,
          durationMs: record.durationMs,
          inputTokens: this.response?.tokens.input ?? 0,
          outputTokens: this.response?.tokens.output ?? 0,
          costUsd: this.response?.costUsd ?? 0,
          toolCalls: this.response?.toolCalls ?? 0,
          summary: redactString(this.summarize()),
          errorMessage: this.errorMessage ? redactString(this.errorMessage) : null,
          payload: JSON.stringify(redacted),
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[trace.persist] failed:', err);
    }
  }

  private summarize(): string {
    if (this.status === 'error') return `ERROR: ${this.errorMessage ?? 'unknown'}`;
    if (this.response) {
      const tc = this.response.toolCalls;
      return `${this.model} · ${this.response.tokens.total} tok · $${this.response.costUsd.toFixed(4)} · ${tc} tool${tc === 1 ? '' : 's'}`;
    }
    return `${this.model} · running`;
  }
}

/**
 * Load a persisted trace for the observability UI.
 */
export async function loadTrace(
  traceId: string,
  tenantId: string
): Promise<TraceRecord | null> {
  const row = await prisma.kernelTrace.findFirst({
    where: { id: traceId, tenantId },
  });
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as TraceRecord;
  } catch {
    return null;
  }
}

/**
 * List recent traces for a tenant, optionally filtered.
 */
export async function listTraces(params: {
  tenantId: string;
  environmentId?: string;
  systemId?: string;
  surface?: string;
  limit?: number;
}): Promise<TraceRecord[]> {
  const rows = await prisma.kernelTrace.findMany({
    where: {
      tenantId: params.tenantId,
      environmentId: params.environmentId,
      systemId: params.systemId,
      surface: params.surface,
    },
    orderBy: { createdAt: 'desc' },
    take: params.limit ?? 50,
  });
  return rows
    .map((r) => {
      try {
        return JSON.parse(r.payload) as TraceRecord;
      } catch {
        return null;
      }
    })
    .filter((r): r is TraceRecord => r !== null);
}
