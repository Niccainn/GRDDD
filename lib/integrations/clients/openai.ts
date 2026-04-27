/**
 * OpenAI client. Read methods (list models, list assistants) plus
 * a write completion that hits the chat-completions endpoint.
 *
 * Auth is per-account API key. Org ID is optional — only needed
 * for users who belong to multiple orgs and want to scope usage
 * to a specific one.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type OpenAICreds = { apiKey: string; orgId?: string };

const API_BASE = 'https://api.openai.com/v1';

export async function getOpenAIClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'openai', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('OpenAI integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as OpenAICreds;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${creds.apiKey}`,
    'Content-Type': 'application/json',
  };
  if (creds.orgId) headers['OpenAI-Organization'] = creds.orgId;

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`OpenAI ${path} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Models the connected key can access. */
    async listModels() {
      const data = await get<{ data: { id: string; created: number; owned_by: string }[] }>('/models');
      return data.data.map(m => ({
        id: m.id,
        createdAt: new Date(m.created * 1000).toISOString(),
        ownedBy: m.owned_by,
      }));
    },

    /** Run a chat completion. Write op (charges the account). */
    async chatCompletion(input: {
      model: string;
      prompt: string;
      system?: string;
      maxTokens?: number;
    }) {
      const messages = [
        ...(input.system ? [{ role: 'system' as const, content: input.system }] : []),
        { role: 'user' as const, content: input.prompt },
      ];
      const res = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
          model: input.model,
          messages,
          max_completion_tokens: input.maxTokens ?? 1024,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI chat completion failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        id: string;
        choices: { message: { content: string }; finish_reason: string }[];
        usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };
      return {
        id: data.id,
        text: data.choices[0]?.message.content ?? '',
        finishReason: data.choices[0]?.finish_reason ?? 'unknown',
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      };
    },
  };
}
