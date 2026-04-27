/**
 * ElevenLabs client — text-to-speech + voice library.
 *
 * Read methods cover voice listing and account info. Write method
 * synthesizes audio from text using a chosen voice. The audio is
 * returned base64-encoded so it survives the JSON boundary back
 * through Nova; clients that want to play it can decode + use as
 * an audio src.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type ElevenLabsCreds = { apiKey: string };

const API_BASE = 'https://api.elevenlabs.io/v1';

export async function getElevenLabsClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'elevenlabs', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('ElevenLabs integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as ElevenLabsCreds;
  const headers = { 'xi-api-key': creds.apiKey, Accept: 'application/json' };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`ElevenLabs ${path} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List voices available on the connected account (premade +
     *  cloned). */
    async listVoices() {
      const data = await get<{
        voices: { voice_id: string; name: string; category: string; preview_url?: string }[];
      }>('/voices');
      return data.voices.map(v => ({
        id: v.voice_id,
        name: v.name,
        category: v.category,
        previewUrl: v.preview_url ?? null,
      }));
    },

    /** Account info — character quota, plan, etc. */
    async getAccountInfo() {
      const data = await get<{
        subscription: {
          tier: string;
          character_count: number;
          character_limit: number;
          can_use_instant_voice_cloning: boolean;
        };
      }>('/user/subscription');
      return {
        tier: data.subscription.tier,
        charactersUsed: data.subscription.character_count,
        characterLimit: data.subscription.character_limit,
        canCloneVoice: data.subscription.can_use_instant_voice_cloning,
      };
    },

    /** Synthesize speech from text. Write op (charges character
     *  quota). Returns base64-encoded mpeg audio. */
    async textToSpeech(input: { voiceId: string; text: string; modelId?: string }) {
      const res = await fetch(`${API_BASE}/text-to-speech/${input.voiceId}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
          text: input.text,
          model_id: input.modelId ?? 'eleven_multilingual_v2',
        }),
      });
      if (!res.ok) throw new Error(`ElevenLabs TTS failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      return {
        audioBase64: buffer.toString('base64'),
        mimeType: 'audio/mpeg',
        sizeBytes: buffer.length,
      };
    },
  };
}
