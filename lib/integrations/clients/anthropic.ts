/**
 * Anthropic client — direct API access for advanced users who want
 * to call Claude models with their own key, separate from the BYOK
 * key the environment uses for Nova itself.
 *
 * Why have this when Nova already calls Claude? Two reasons:
 *   - Some users want to run prompts that aren't part of a Nova
 *     workflow — ad-hoc completions, batch evaluations, etc.
 *   - Different teams in the same org may have separate Anthropic
 *     accounts for billing/usage tracking; this lets them connect
 *     a per-environment key independent of the workspace BYOK.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type AnthropicCreds = { apiKey: string };

const API_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

export async function getAnthropicClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'anthropic', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Anthropic integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as AnthropicCreds;
  const headers = {
    'x-api-key': creds.apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    'Content-Type': 'application/json',
  };

  return {
    integration,

    /** List available models. Useful for the connect UI to show
     *  the user what they can actually call. */
    async listModels() {
      const res = await fetch(`${API_BASE}/models`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Anthropic listModels failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as { data: { id: string; display_name?: string; type: string }[] };
      return data.data.map(m => ({ id: m.id, displayName: m.display_name ?? m.id, type: m.type }));
    },

    /** Run a single completion. Write op — only fires for real
     *  when NOVA_TOOLS_LIVE=1. */
    async completion(input: { model: string; prompt: string; maxTokens?: number; system?: string }) {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
          model: input.model,
          max_tokens: input.maxTokens ?? 1024,
          ...(input.system ? { system: input.system } : {}),
          messages: [{ role: 'user', content: input.prompt }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic completion failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        id: string;
        content: { type: string; text?: string }[];
        stop_reason: string;
        usage: { input_tokens: number; output_tokens: number };
      };
      const text = data.content.filter(c => c.type === 'text').map(c => c.text ?? '').join('');
      return {
        id: data.id,
        text,
        stopReason: data.stop_reason,
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      };
    },
  };
}
