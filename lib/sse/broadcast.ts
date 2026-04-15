import { broadcast, sendTo } from './connections';

export type UpdateType =
  | 'execution.completed'
  | 'task.updated'
  | 'goal.progress'
  | 'workflow.status';

let warnedOnce = false;

export function broadcastUpdate(type: UpdateType, entityId: string, data: unknown) {
  if (process.env.NODE_ENV === 'production' && !process.env.UPSTASH_REDIS_REST_URL && !warnedOnce) {
    console.warn('[sse] In-memory connection store active. For multi-instance deployments, set UPSTASH_REDIS_REST_URL for Redis-backed pub/sub.');
    warnedOnce = true;
  }
  broadcast('update', { type, entityId, data });
}

export function broadcastToUser(identityId: string, event: string, data: unknown) {
  sendTo(identityId, event, data);
}
