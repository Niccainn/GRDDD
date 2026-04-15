/**
 * Workspace Attention Graph
 *
 * The structural answer to the remote-work problem: in a distributed
 * team, "recent" and "important" are not the same thing. A message at
 * 3am in Singapore is recent to Europe but not to the US; a goal
 * change touched by a person's direct collaborator matters more to
 * them than one touched by someone on another continent.
 *
 * This module builds a bipartite graph
 *
 *     People  ↔  Systems/Goals/Signals
 *
 * from recent activity and then computes a **personalized PageRank**
 * from a given person's node. Every entity in the workspace is given
 * an attention score from THAT person's point of view, with exponential
 * time-decay on edges so stale activity fades naturally.
 *
 * Why personalized PageRank:
 *   - It captures "things my collaborators care about" recursively
 *   - It handles cold-start gracefully (a person with no history falls
 *     back to global popularity)
 *   - It is cheap: O(edges × iterations) with ~20 iterations sufficient
 *     for workspace-scale graphs (<10k nodes)
 *
 * The module is dependency-free and stateless. Callers pass raw edge
 * data in; they get a ranked list out. A later pass can wire this into
 * the UI as "what you should look at first" or into the problem-radar
 * template as a per-user sensitivity weighting.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type NodeId = string;

export interface Edge {
  /** Who took the action. */
  person: NodeId;
  /** What they touched. */
  entity: NodeId;
  /**
   * Edge weight before decay. Larger = stronger signal of attention.
   * Suggested scale: 1 = passive read, 3 = active edit, 5 = decision.
   */
  weight: number;
  /** Unix ms timestamp of the action. */
  timestamp: number;
}

export interface RankInput {
  /** Edges over the evaluation window. */
  edges: Edge[];
  /** Person whose point of view we're ranking from. */
  viewer: NodeId;
  /**
   * Half-life in ms. After this interval, an edge's weight is halved.
   * Default: 7 days.
   */
  halfLifeMs?: number;
  /** Number of PageRank iterations. 20 is plenty for <10k nodes. */
  iterations?: number;
  /**
   * Damping factor (standard PageRank parameter). 0.85 is the classic
   * choice; lower = more influence from the viewer's personal seed,
   * higher = more global popularity influence.
   */
  damping?: number;
}

export interface RankedEntity {
  id: NodeId;
  score: number;
  /** How many viewer-reachable edges contributed to the score. */
  edgeCount: number;
}

// ─── Core algorithm ─────────────────────────────────────────────────────────

const DEFAULT_HALF_LIFE = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_ITERATIONS = 20;
const DEFAULT_DAMPING = 0.85;

/**
 * Personalized PageRank from the viewer's seed.
 * Returns entities ranked by the viewer's point of view, highest first.
 */
export function rankAttention(input: RankInput): RankedEntity[] {
  const halfLife = input.halfLifeMs ?? DEFAULT_HALF_LIFE;
  const iterations = input.iterations ?? DEFAULT_ITERATIONS;
  const damping = input.damping ?? DEFAULT_DAMPING;
  const now = Date.now();

  if (input.edges.length === 0) return [];

  // ─── 1. Time-decay edge weights ──────────────────────────────────────
  // Each edge's contribution = weight × 2^(-age/halfLife).
  const decayed: Array<{ person: NodeId; entity: NodeId; w: number }> = [];
  for (const e of input.edges) {
    const age = Math.max(0, now - e.timestamp);
    const decay = Math.pow(2, -age / halfLife);
    const w = e.weight * decay;
    if (w > 1e-6) decayed.push({ person: e.person, entity: e.entity, w });
  }

  if (decayed.length === 0) return [];

  // ─── 2. Build bipartite adjacency (person ↔ entity) ─────────────────
  const nodes = new Set<NodeId>();
  const outWeight = new Map<NodeId, number>();
  const forward = new Map<NodeId, Map<NodeId, number>>();
  const reverse = new Map<NodeId, Map<NodeId, number>>();
  const entityEdgeCount = new Map<NodeId, number>();

  function addEdge(from: NodeId, to: NodeId, w: number) {
    nodes.add(from);
    nodes.add(to);
    outWeight.set(from, (outWeight.get(from) ?? 0) + w);
    const f = forward.get(from) ?? new Map<NodeId, number>();
    f.set(to, (f.get(to) ?? 0) + w);
    forward.set(from, f);
    const r = reverse.get(to) ?? new Map<NodeId, number>();
    r.set(from, (r.get(from) ?? 0) + w);
    reverse.set(to, r);
  }

  for (const d of decayed) {
    // Symmetric: a person walks to an entity AND the entity walks
    // back to the person (so a collaborator's attention flows to me).
    addEdge(d.person, d.entity, d.w);
    addEdge(d.entity, d.person, d.w);
    entityEdgeCount.set(d.entity, (entityEdgeCount.get(d.entity) ?? 0) + 1);
  }

  // Cold start: viewer not in graph → fall back to uniform popularity.
  if (!nodes.has(input.viewer)) {
    const popularity: RankedEntity[] = [];
    for (const [id, count] of entityEdgeCount) {
      const w = reverse.get(id);
      let s = 0;
      if (w) for (const v of w.values()) s += v;
      popularity.push({ id, score: s, edgeCount: count });
    }
    return popularity.sort((a, b) => b.score - a.score);
  }

  // ─── 3. Personalized PageRank iteration ─────────────────────────────
  // Seed: all mass at the viewer.
  const rank = new Map<NodeId, number>();
  for (const n of nodes) rank.set(n, 0);
  rank.set(input.viewer, 1);

  const teleport = new Map<NodeId, number>();
  teleport.set(input.viewer, 1 - damping);

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Map<NodeId, number>();
    for (const n of nodes) next.set(n, teleport.get(n) ?? 0);

    for (const [from, edges] of forward) {
      const total = outWeight.get(from) ?? 0;
      if (total === 0) continue;
      const rankFrom = rank.get(from) ?? 0;
      if (rankFrom === 0) continue;
      for (const [to, w] of edges) {
        const share = damping * rankFrom * (w / total);
        next.set(to, (next.get(to) ?? 0) + share);
      }
    }

    // Reabsorb dangling mass back to the viewer (avoids rank sink).
    let total = 0;
    for (const v of next.values()) total += v;
    const leaked = 1 - total;
    if (leaked > 0) {
      next.set(input.viewer, (next.get(input.viewer) ?? 0) + leaked);
    }

    for (const [k, v] of next) rank.set(k, v);
  }

  // ─── 4. Filter to entities only, not people ─────────────────────────
  const out: RankedEntity[] = [];
  for (const [id, score] of rank) {
    if (id === input.viewer) continue;
    if (!entityEdgeCount.has(id)) continue; // skip people nodes
    out.push({ id, score, edgeCount: entityEdgeCount.get(id) ?? 0 });
  }
  return out.sort((a, b) => b.score - a.score);
}

// ─── Convenience: "what should this person look at?" ────────────────────────

export interface FocusListOptions {
  edges: Edge[];
  viewer: NodeId;
  limit?: number;
  halfLifeMs?: number;
}

/**
 * Return the top-N entities this person should pay attention to right
 * now. Thin wrapper around rankAttention + slice.
 */
export function focusList(opts: FocusListOptions): RankedEntity[] {
  const ranked = rankAttention({
    edges: opts.edges,
    viewer: opts.viewer,
    halfLifeMs: opts.halfLifeMs,
  });
  return ranked.slice(0, opts.limit ?? 10);
}

// ─── Public: simple uniform fallback (for tests / cold start) ──────────────

export function globalPopularity(edges: Edge[]): RankedEntity[] {
  const scores = new Map<NodeId, { score: number; count: number }>();
  for (const e of edges) {
    const cur = scores.get(e.entity) ?? { score: 0, count: 0 };
    cur.score += e.weight;
    cur.count += 1;
    scores.set(e.entity, cur);
  }
  return Array.from(scores.entries())
    .map(([id, { score, count }]) => ({ id, score, edgeCount: count }))
    .sort((a, b) => b.score - a.score);
}
