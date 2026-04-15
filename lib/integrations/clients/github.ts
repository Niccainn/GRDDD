/**
 * GitHub read client. Exposes repository, issue, and PR reads against
 * the REST v3 API. accountLabel stores the GitHub login of the
 * authenticated user.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type GitHubCreds = { accessToken: string };

const API_BASE = 'https://api.github.com';

export async function getGitHubClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'github', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('GitHub integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as GitHubCreds;
  const headers = {
    Authorization: `Bearer ${creds.accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Grid',
  };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** List repos for the authenticated user. */
    async listRepos(limit = 30) {
      const rows = await get<{ id: number; full_name: string; private: boolean; default_branch: string; stargazers_count: number; updated_at: string }[]>(
        `/user/repos?per_page=${limit}&sort=updated`,
      );
      return rows.map(r => ({
        id: r.id,
        fullName: r.full_name,
        private: r.private,
        defaultBranch: r.default_branch,
        stars: r.stargazers_count,
        updatedAt: r.updated_at,
      }));
    },

    /**
     * Post a comment on an existing issue or pull request. WRITE —
     * Phase 5 approval-gated. The body is plaintext or markdown.
     */
    async createIssueComment(owner: string, repo: string, issueNumber: number, body: string) {
      const res = await fetch(`${API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub createIssueComment failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as { id: number; html_url: string };
      return { id: data.id, url: data.html_url };
    },

    /**
     * Close an issue or pull request. WRITE — Phase 6 approval-gated.
     */
    async closeIssue(owner: string, repo: string, issueNumber: number): Promise<{ number: number; state: string }> {
      const res = await fetch(`${API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'closed' }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub closeIssue failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as { number: number; state: string };
      return { number: data.number, state: data.state };
    },

    /** Open issues for a given repo. */
    async listOpenIssues(owner: string, repo: string, limit = 20) {
      const rows = await get<{ number: number; title: string; user: { login: string }; labels: { name: string }[]; created_at: string; comments: number }[]>(
        `/repos/${owner}/${repo}/issues?state=open&per_page=${limit}`,
      );
      return rows.map(r => ({
        number: r.number,
        title: r.title,
        author: r.user.login,
        labels: r.labels.map(l => l.name),
        createdAt: r.created_at,
        comments: r.comments,
      }));
    },
  };
}
