/**
 * Typeform read client. Uses the Typeform API for listing forms and
 * retrieving form responses. Bearer token auth via personal access
 * token or OAuth token.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type TypeformCreds = { accessToken: string };

const API_BASE = 'https://api.typeform.com';

export async function getTypeformClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'typeform', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Typeform integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as TypeformCreds;
  const headers = {
    Authorization: `Bearer ${creds.accessToken}`,
    Accept: 'application/json',
  };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Typeform ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List all forms accessible to the token. */
    async listForms() {
      const data = await get<{
        items: {
          id: string;
          title: string;
          last_updated_at: string;
          created_at: string;
          settings: { is_public: boolean };
          _links: { display: string };
        }[];
        total_items: number;
      }>('/forms');
      return {
        totalItems: data.total_items,
        forms: data.items.map(f => ({
          id: f.id,
          title: f.title,
          lastUpdatedAt: f.last_updated_at,
          createdAt: f.created_at,
          isPublic: f.settings.is_public,
          displayUrl: f._links.display,
        })),
      };
    },

    /** Get responses for a specific form. */
    async getFormResponses(formId: string, limit = 25) {
      const data = await get<{
        total_items: number;
        items: {
          response_id: string;
          submitted_at: string;
          landed_at: string;
          answers: {
            field: { id: string; type: string; ref: string };
            type: string;
            text?: string;
            number?: number;
            boolean?: boolean;
            choice?: { label: string };
            choices?: { labels: string[] };
            email?: string;
            url?: string;
            date?: string;
          }[];
        }[];
      }>(`/forms/${formId}/responses?page_size=${limit}`);
      return {
        totalItems: data.total_items,
        responses: data.items.map(r => ({
          responseId: r.response_id,
          submittedAt: r.submitted_at,
          landedAt: r.landed_at,
          answers: r.answers.map(a => ({
            fieldId: a.field.id,
            fieldType: a.field.type,
            type: a.type,
            value:
              a.text ??
              a.number ??
              a.boolean ??
              a.choice?.label ??
              a.choices?.labels ??
              a.email ??
              a.url ??
              a.date ??
              null,
          })),
        })),
      };
    },
  };
}
