/**
 * Jira read client. Uses Basic auth with email:apiToken
 * and the domain stored in accountLabel.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type JiraCreds = { email: string; apiToken: string };

export async function getJiraClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'jira', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Jira integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as JiraCreds;
  const domain = integration.accountLabel ?? '';
  const base = `https://${domain}.atlassian.net/rest/api/3`;
  const headers = {
    Authorization: `Basic ${Buffer.from(`${creds.email}:${creds.apiToken}`).toString('base64')}`,
    Accept: 'application/json',
  };

  return {
    integration,

    /** Fetch issues assigned to the current user. */
    async getMyIssues(limit = 20) {
      const jql = encodeURIComponent('assignee=currentUser() ORDER BY updated DESC');
      const url = `${base}/search?jql=${jql}&maxResults=${limit}&fields=summary,status,priority,updated,assignee`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Jira error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        issues: { key: string; fields: { summary: string; status: { name: string }; priority: { name: string }; updated: string } }[];
      };
      return data.issues.map(i => ({
        key: i.key,
        summary: i.fields.summary,
        status: i.fields.status.name,
        priority: i.fields.priority?.name ?? null,
        updated: i.fields.updated,
      }));
    },

    /** Search issues with a JQL query. */
    async searchIssues(jql: string, limit = 20) {
      const url = `${base}/search?jql=${encodeURIComponent(jql)}&maxResults=${limit}&fields=summary,status,priority,updated,assignee`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Jira error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        issues: { key: string; fields: { summary: string; status: { name: string }; priority: { name: string }; updated: string } }[];
      };
      return data.issues.map(i => ({
        key: i.key,
        summary: i.fields.summary,
        status: i.fields.status.name,
        priority: i.fields.priority?.name ?? null,
        updated: i.fields.updated,
      }));
    },

    /** Get a single project by key. */
    async getProject(projectKey: string) {
      const url = `${base}/project/${encodeURIComponent(projectKey)}`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Jira error (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as {
        id: string; key: string; name: string; projectTypeKey: string; style: string;
      };
      return {
        id: data.id,
        key: data.key,
        name: data.name,
        type: data.projectTypeKey,
        style: data.style,
      };
    },
  };
}
