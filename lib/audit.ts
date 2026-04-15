import { prisma } from './db';

export type AuditAction =
  // Workflows
  | 'workflow.created' | 'workflow.updated' | 'workflow.deleted' | 'workflow.status_changed'
  // Executions
  | 'execution.started' | 'execution.completed' | 'execution.failed'
  // Systems
  | 'system.created' | 'system.updated' | 'system.deleted'
  // Environments
  | 'environment.created' | 'environment.updated'
  // Team
  | 'member.added' | 'member.removed' | 'member.role_changed'
  // Nova
  | 'nova.query' | 'nova.memory_updated'
  // Automations
  | 'automation.created' | 'automation.toggled' | 'automation.run'
  // Webhooks
  | 'webhook.created' | 'webhook.deleted' | 'webhook.test'
  // Alerts
  | 'alert.fired'
  // Agent write-path approvals (Phase 5/6)
  | 'agent.action.approved' | 'agent.action.rejected'
  | 'agent.action.executed' | 'agent.action.failed';

type AuditParams = {
  action: AuditAction;
  entity: string;
  entityId?: string;
  entityName?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  actorId?: string;
  actorName?: string;
  actorType?: string;
  environmentId?: string;
  environmentName?: string;
};

/**
 * Write an immutable audit log entry. Fire-and-forget — never throws.
 */
export function audit(params: AuditParams): void {
  prisma.auditLog.create({
    data: {
      action:          params.action,
      entity:          params.entity,
      entityId:        params.entityId ?? null,
      entityName:      params.entityName ?? null,
      before:          params.before   ? JSON.stringify(params.before)   : null,
      after:           params.after    ? JSON.stringify(params.after)    : null,
      metadata:        params.metadata ? JSON.stringify(params.metadata) : null,
      actorId:         params.actorId   ?? null,
      actorName:       params.actorName ?? null,
      actorType:       params.actorType ?? 'PERSON',
      environmentId:   params.environmentId   ?? null,
      environmentName: params.environmentName ?? null,
    },
  }).catch(() => { /* audit must never crash callers */ });
}

