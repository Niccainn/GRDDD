/**
 * Executor types — the contract every skill implementation obeys.
 *
 * An executor takes a Step + the Project it belongs to and returns
 * an updated Step plus any artifacts it produced and any trace lines
 * worth persisting. Executors are server-side only and must be
 * idempotent enough that a retry is safe.
 */

import type { Artifact, Step, Project, TraceEntry } from '@/lib/projects/types';

export type ExecutorResult = {
  /** Updated step — usually with status 'done' and completedAt set. */
  step: Step;
  /** New artifacts produced by this step. */
  artifacts: Artifact[];
  /** Trace lines to append. The orchestrator also adds its own. */
  trace: Omit<TraceEntry, 'at'>[];
  /** Whether this executor actually reached an external system, or
   *  ran in demo / simulated mode. UI surfaces the difference. */
  mode: 'real' | 'simulated' | 'reasoning' | 'human_gate';
  /** Optional: tokens + dollar cost the executor spent. */
  cost?: { tokens: number; usd: number };
};

export type Executor = (args: {
  step: Step;
  project: Project;
}) => Promise<ExecutorResult>;
