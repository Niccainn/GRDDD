/**
 * Figma read client — provides tools for Nova and Agents to read
 * design files, components, styles, and variables from Figma.
 *
 * API docs: https://www.figma.com/developers/api
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';
import type { Integration } from '@prisma/client';

type FigmaCreds = { accessToken: string };

async function figmaFetch(accessToken: string, path: string) {
  const res = await fetch(`https://api.figma.com/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Figma API ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function getFigmaClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'figma', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Figma integration not found or inactive');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as FigmaCreds;
  const token = creds.accessToken;

  return {
    integration,

    /** List recent files in the user's Figma teams/projects. */
    async listFiles(teamId?: string, projectId?: string): Promise<{
      files: { key: string; name: string; last_modified: string; thumbnail_url: string }[];
    }> {
      if (projectId) {
        const data = await figmaFetch(token, `/projects/${projectId}/files`);
        return {
          files: (data.files ?? []).slice(0, 30).map((f: Record<string, unknown>) => ({
            key: f.key,
            name: f.name,
            last_modified: f.last_modified,
            thumbnail_url: f.thumbnail_url,
          })),
        };
      }
      if (teamId) {
        const data = await figmaFetch(token, `/teams/${teamId}/projects`);
        return {
          files: (data.projects ?? []).slice(0, 20).map((p: Record<string, unknown>) => ({
            key: p.id,
            name: p.name,
            last_modified: '',
            thumbnail_url: '',
          })),
        };
      }
      // No team or project — list user's recent files
      const data = await figmaFetch(token, '/me');
      return { files: [{ key: '', name: data.handle, last_modified: '', thumbnail_url: data.img_url ?? '' }] };
    },

    /** Get file metadata: name, pages, components, styles. */
    async getFile(fileKey: string): Promise<{
      name: string;
      lastModified: string;
      pages: { id: string; name: string; childCount: number }[];
      components: { key: string; name: string; description: string }[];
      styles: { key: string; name: string; styleType: string; description: string }[];
    }> {
      const data = await figmaFetch(token, `/files/${fileKey}?depth=1`);
      const pages = (data.document?.children ?? []).map((p: Record<string, unknown>) => ({
        id: p.id,
        name: p.name,
        childCount: Array.isArray(p.children) ? p.children.length : 0,
      }));

      // Extract published components
      const components = (Object.entries(data.components ?? {}) as [string, Record<string, unknown>][]).map(([key, c]) => ({
        key,
        name: String(c.name ?? ''),
        description: String(c.description ?? ''),
      }));

      // Extract published styles
      const styles = (Object.entries(data.styles ?? {}) as [string, Record<string, unknown>][]).map(([key, s]) => ({
        key,
        name: String(s.name ?? ''),
        styleType: String(s.styleType ?? ''),
        description: String(s.description ?? ''),
      }));

      return {
        name: data.name,
        lastModified: data.lastModified,
        pages,
        components,
        styles,
      };
    },

    /** Get specific nodes from a file (components, frames, etc.) */
    async getNodes(fileKey: string, nodeIds: string[]): Promise<{
      nodes: { id: string; name: string; type: string; children?: unknown[] }[];
    }> {
      const ids = nodeIds.join(',');
      const data = await figmaFetch(token, `/files/${fileKey}/nodes?ids=${encodeURIComponent(ids)}&depth=2`);
      const nodes = (Object.entries(data.nodes ?? {}) as [string, Record<string, unknown>][]).map(([id, wrapper]) => {
        const doc = wrapper.document as Record<string, unknown>;
        return {
          id,
          name: String(doc?.name ?? ''),
          type: String(doc?.type ?? ''),
          children: Array.isArray(doc?.children)
            ? doc.children.map((c: Record<string, unknown>) => ({
                id: c.id, name: c.name, type: c.type,
                characters: c.characters ?? undefined,
              }))
            : [],
        };
      });
      return { nodes };
    },

    /** Get text content from a file — extracts all TEXT nodes. */
    async getTextContent(fileKey: string): Promise<{
      texts: { nodeId: string; name: string; characters: string; style: Record<string, unknown> }[];
    }> {
      const data = await figmaFetch(token, `/files/${fileKey}`);
      const texts: { nodeId: string; name: string; characters: string; style: Record<string, unknown> }[] = [];

      function walk(node: Record<string, unknown>) {
        if (node.type === 'TEXT' && node.characters) {
          texts.push({
            nodeId: String(node.id),
            name: String(node.name ?? ''),
            characters: String(node.characters),
            style: (node.style ?? {}) as Record<string, unknown>,
          });
        }
        if (Array.isArray(node.children)) {
          for (const child of node.children) walk(child as Record<string, unknown>);
        }
      }
      walk(data.document ?? {});
      return { texts: texts.slice(0, 200) }; // cap to avoid massive payloads
    },

    /** Get image renders of specific nodes. */
    async getImages(fileKey: string, nodeIds: string[], format: 'png' | 'svg' = 'png'): Promise<{
      images: Record<string, string>;
    }> {
      const ids = nodeIds.join(',');
      const data = await figmaFetch(token, `/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=${format}`);
      return { images: data.images ?? {} };
    },

    /** List published components in a file. */
    async getComponents(fileKey: string): Promise<{
      components: { key: string; name: string; description: string; containing_frame: string }[];
    }> {
      const data = await figmaFetch(token, `/files/${fileKey}/components`);
      return {
        components: (data.meta?.components ?? []).map((c: Record<string, unknown>) => ({
          key: c.key,
          name: c.name,
          description: c.description ?? '',
          containing_frame: (c.containing_frame as Record<string, unknown>)?.name ?? '',
        })),
      };
    },

    /** Get comments on a file. */
    async getComments(fileKey: string): Promise<{
      comments: { id: string; message: string; user: string; created_at: string; resolved_at: string | null }[];
    }> {
      const data = await figmaFetch(token, `/files/${fileKey}/comments`);
      return {
        comments: (data.comments ?? []).slice(0, 50).map((c: Record<string, unknown>) => ({
          id: c.id,
          message: c.message,
          user: (c.user as Record<string, unknown>)?.handle ?? 'Unknown',
          created_at: c.created_at,
          resolved_at: c.resolved_at ?? null,
        })),
      };
    },
  };
}
