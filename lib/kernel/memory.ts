/**
 * Nova Kernel — Memory
 *
 * Per-tenant learned behaviors. Backed by the KernelMemory table.
 *
 * Memories are NOT conversation history. They are distilled facts
 * that transcend any single conversation:
 *
 *   preference: "Alex prefers concise answers with bullet points"
 *   pattern:    "Instagram posts with 3+ hashtags outperform by 2x"
 *   outcome:    "Workflow 'Q2 campaign' shipped in 2 days last quarter"
 *   caveat:     "Never auto-publish without review for this client"
 */

import { prisma } from '../db';
import type { MemoryEntry } from './types';

export interface RecordMemoryInput {
  tenantId: string;
  kind: MemoryEntry['kind'];
  key: string;
  value: string;
  confidence?: number;
  environmentId?: string;
  systemId?: string;
}

/**
 * Record a new memory, OR reinforce an existing one with the same key.
 */
export async function recordMemory(input: RecordMemoryInput): Promise<string> {
  const existing = await prisma.kernelMemory.findFirst({
    where: {
      tenantId: input.tenantId,
      environmentId: input.environmentId ?? null,
      key: input.key,
    },
  });

  if (existing) {
    const updated = await prisma.kernelMemory.update({
      where: { id: existing.id },
      data: {
        value: input.value,
        confidence: Math.min(1, existing.confidence + 0.05),
        reinforcements: existing.reinforcements + 1,
        lastUsedAt: new Date(),
      },
    });
    return updated.id;
  }

  const created = await prisma.kernelMemory.create({
    data: {
      tenantId: input.tenantId,
      environmentId: input.environmentId ?? null,
      systemId: input.systemId ?? null,
      kind: input.kind,
      key: input.key,
      value: input.value,
      confidence: input.confidence ?? 0.7,
      reinforcements: 1,
    },
  });
  return created.id;
}

export async function loadRelevantMemories(params: {
  tenantId: string;
  environmentId?: string;
  limit?: number;
}): Promise<MemoryEntry[]> {
  const rows = await prisma.kernelMemory.findMany({
    where: {
      tenantId: params.tenantId,
      OR: params.environmentId
        ? [{ environmentId: params.environmentId }, { environmentId: null }]
        : undefined,
    },
    orderBy: [{ confidence: 'desc' }, { reinforcements: 'desc' }, { createdAt: 'desc' }],
    take: params.limit ?? 20,
  });

  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    key: r.key,
    value: r.value,
    kind: r.kind as MemoryEntry['kind'],
    confidence: r.confidence,
    reinforcements: r.reinforcements,
    createdAt: r.createdAt,
    lastUsedAt: r.lastUsedAt ?? undefined,
  }));
}

/**
 * Format memories as a block that can be prepended to a system prompt.
 */
export function formatMemoriesForPrompt(memories: MemoryEntry[]): string {
  if (!memories.length) return '';

  const byKind: Record<string, MemoryEntry[]> = {};
  for (const m of memories) {
    (byKind[m.kind] ||= []).push(m);
  }

  const sections: string[] = ['<learned_context>'];
  for (const [kind, items] of Object.entries(byKind)) {
    sections.push(`  <${kind}>`);
    for (const item of items) {
      sections.push(`    - ${item.key}: ${item.value}`);
    }
    sections.push(`  </${kind}>`);
  }
  sections.push('</learned_context>');
  return sections.join('\n');
}
