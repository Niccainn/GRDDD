/**
 * Linear read client. Uses the GraphQL API. Linear is GraphQL-first
 * so every query gets hand-written rather than loaded through an SDK,
 * keeping this file zero-dep.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type LinearCreds = { accessToken: string };
const API_URL = 'https://api.linear.app/graphql';

export async function getLinearClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'linear', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Linear integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as LinearCreds;

  async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    const data = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (data.errors) throw new Error(`Linear GQL error: ${data.errors[0].message}`);
    if (!data.data) throw new Error('Linear GQL returned no data');
    return data.data;
  }

  return {
    integration,

    /** List open issues assigned to the current user. */
    async getMyOpenIssues(limit = 25) {
      const data = await gql<{
        viewer: {
          assignedIssues: { nodes: { id: string; identifier: string; title: string; priority: number; state: { name: string }; team: { name: string }; updatedAt: string }[] };
        };
      }>(
        `query($limit: Int!) {
          viewer {
            assignedIssues(first: $limit, filter: { state: { type: { nin: ["completed", "canceled"] } } }) {
              nodes { id identifier title priority state { name } team { name } updatedAt }
            }
          }
        }`,
        { limit },
      );
      return data.viewer.assignedIssues.nodes;
    },

    /**
     * Create a new Linear issue. WRITE — Phase 5 approval-gated.
     * Returns the new issue id + url.
     */
    async createIssue(args: {
      teamId: string;
      title: string;
      description?: string;
    }): Promise<{ id: string; identifier: string; url: string }> {
      const data = await gql<{
        issueCreate: { success: boolean; issue: { id: string; identifier: string; url: string } | null };
      }>(
        `mutation($input: IssueCreateInput!) {
          issueCreate(input: $input) { success issue { id identifier url } }
        }`,
        { input: { teamId: args.teamId, title: args.title, description: args.description ?? '' } },
      );
      if (!data.issueCreate.success || !data.issueCreate.issue) {
        throw new Error('Linear issueCreate did not succeed');
      }
      return data.issueCreate.issue;
    },

    /**
     * Add a comment to an existing Linear issue. WRITE — Phase 6
     * approval-gated.
     */
    async addComment(args: { issueId: string; body: string }): Promise<{ id: string; url: string }> {
      const data = await gql<{
        commentCreate: { success: boolean; comment: { id: string; url: string } | null };
      }>(
        `mutation($input: CommentCreateInput!) {
          commentCreate(input: $input) { success comment { id url } }
        }`,
        { input: { issueId: args.issueId, body: args.body } },
      );
      if (!data.commentCreate.success || !data.commentCreate.comment) {
        throw new Error('Linear commentCreate did not succeed');
      }
      return data.commentCreate.comment;
    },

    /**
     * Move an issue to a different workflow state. WRITE — Phase 6
     * approval-gated. `stateId` comes from team.states; the agent is
     * expected to look it up first if it doesn't already know it.
     */
    async updateIssueState(args: { issueId: string; stateId: string }): Promise<{ id: string }> {
      const data = await gql<{
        issueUpdate: { success: boolean; issue: { id: string } | null };
      }>(
        `mutation($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) { success issue { id } }
        }`,
        { id: args.issueId, input: { stateId: args.stateId } },
      );
      if (!data.issueUpdate.success || !data.issueUpdate.issue) {
        throw new Error('Linear issueUpdate did not succeed');
      }
      return data.issueUpdate.issue;
    },

    /** Counts of issues per state for the authenticated user's team(s). */
    async getTeamIssueCounts() {
      const data = await gql<{
        teams: {
          nodes: { id: string; name: string; issues: { nodes: { state: { type: string } }[] } }[];
        };
      }>(
        `{ teams { nodes { id name issues(first: 250) { nodes { state { type } } } } } }`,
      );
      return data.teams.nodes.map(team => {
        const counts = team.issues.nodes.reduce<Record<string, number>>((acc, i) => {
          acc[i.state.type] = (acc[i.state.type] ?? 0) + 1;
          return acc;
        }, {});
        return { teamId: team.id, team: team.name, counts };
      });
    },
  };
}
