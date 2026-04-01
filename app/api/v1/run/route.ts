/**
 * POST /api/v1/run
 * External workflow trigger endpoint.
 *
 * Headers:
 *   Authorization: Bearer grd_xxxxx
 *
 * Body:
 *   { workflowId: string, input: string, async?: boolean }
 *
 * Returns:
 *   { executionId: string, status: "queued" | "completed" }
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { hashApiKey } from '@/lib/api-keys';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const rawKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!rawKey) {
    return Response.json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  const keyHash = hashApiKey(rawKey);
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });

  if (!apiKey || !apiKey.isActive) {
    return Response.json({ error: 'Invalid or inactive API key' }, { status: 401 });
  }
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return Response.json({ error: 'API key expired' }, { status: 401 });
  }

  // Update last used timestamp
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsed: new Date() },
  }).catch(() => {});

  // ── Body ──────────────────────────────────────────────────────────────────
  let body: { workflowId?: string; systemId?: string; input?: string; async?: boolean };
  try { body = await req.json(); } catch { body = {}; }

  if (!body.input?.trim()) {
    return Response.json({ error: 'input is required' }, { status: 400 });
  }
  if (!body.workflowId && !body.systemId) {
    return Response.json({ error: 'workflowId or systemId is required' }, { status: 400 });
  }

  // Resolve the system
  let systemId = body.systemId;
  let workflowId = body.workflowId;

  if (workflowId && !systemId) {
    const wf = await prisma.workflow.findUnique({
      where: { id: workflowId },
      select: { systemId: true },
    });
    if (!wf) return Response.json({ error: 'Workflow not found' }, { status: 404 });
    systemId = wf.systemId;
  }

  if (!systemId) return Response.json({ error: 'Could not resolve system' }, { status: 400 });

  // ── Create execution ───────────────────────────────────────────────────────
  const execution = await prisma.execution.create({
    data: {
      status: 'RUNNING',
      input: body.input,
      systemId,
      currentStage: 0,
      ...(workflowId ? { workflowId } : {}),
    },
  });

  await prisma.systemState.upsert({
    where: { systemId },
    update: { lastActivity: new Date() },
    create: { systemId, lastActivity: new Date() },
  });

  audit({
    action: 'execution.started',
    entity: 'Execution',
    entityId: execution.id,
    entityName: 'API Trigger',
    metadata: { apiKeyId: apiKey.id, apiKeyName: apiKey.name, workflowId: workflowId ?? null },
    actorType: 'SYSTEM',
    actorName: `API: ${apiKey.name}`,
  });

  return Response.json({
    executionId: execution.id,
    status: 'queued',
    message: 'Execution created. Use the GRID dashboard or POST /api/nova/execute to process it.',
  }, { status: 202 });
}
