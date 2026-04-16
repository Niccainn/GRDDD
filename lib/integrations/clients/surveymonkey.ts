/**
 * SurveyMonkey read client. Uses the v3 API with Bearer auth.
 * Surveys and responses for form/feedback dashboards.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type SurveyMonkeyCreds = { accessToken: string };
const API_BASE = 'https://api.surveymonkey.com/v3';

export async function getSurveyMonkeyClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'surveymonkey', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('SurveyMonkey integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as SurveyMonkeyCreds;
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' };

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SurveyMonkey ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List surveys. */
    async listSurveys(limit = 25) {
      const data = await get<{
        data: {
          id: string;
          title: string;
          nickname: string;
          response_count: number;
          date_created: string;
          date_modified: string;
          href: string;
        }[];
      }>('/surveys', { per_page: String(limit), sort_by: 'date_modified', sort_order: 'DESC' });
      return data.data.map(s => ({
        id: s.id,
        title: s.title,
        nickname: s.nickname,
        responseCount: s.response_count,
        createdAt: s.date_created,
        modifiedAt: s.date_modified,
      }));
    },

    /** Responses for a specific survey. */
    async getSurveyResponses(surveyId: string, limit = 25) {
      const data = await get<{
        data: {
          id: string;
          total_time: number;
          date_created: string;
          date_modified: string;
          response_status: string;
          ip_address: string;
          collector_id: string;
          pages: {
            id: string;
            questions: {
              id: string;
              answers: { text?: string; choice_id?: string; row_id?: string }[];
            }[];
          }[];
        }[];
      }>(`/surveys/${surveyId}/responses/bulk`, { per_page: String(limit), sort_by: 'date_modified', sort_order: 'DESC' });
      return data.data.map(r => ({
        id: r.id,
        totalTime: r.total_time,
        status: r.response_status,
        createdAt: r.date_created,
        modifiedAt: r.date_modified,
        collectorId: r.collector_id,
        pages: r.pages.map(p => ({
          id: p.id,
          questions: p.questions.map(q => ({
            id: q.id,
            answers: q.answers,
          })),
        })),
      }));
    },
  };
}
