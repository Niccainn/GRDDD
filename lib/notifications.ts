/**
 * Server-side notification helpers.
 * Import from any API route to create notifications.
 */
import { prisma } from '@/lib/db';

export type NotificationType =
  | 'execution_complete'
  | 'execution_failed'
  | 'goal_reached'
  | 'mention'
  | 'system_alert'
  | 'workflow_update'
  | 'comment_reply';

export interface CreateNotificationInput {
  identityId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  meta?: Record<string, unknown>;
}

/**
 * Create a single notification for a user.
 * Safe to call fire-and-forget — errors are caught and logged.
 */
export async function createNotification(input: CreateNotificationInput) {
  try {
    return await prisma.notification.create({
      data: {
        identityId: input.identityId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[createNotification] failed:', err);
    return null;
  }
}

/**
 * Create notifications for multiple users at once (same content).
 */
export async function createNotifications(
  identityIds: string[],
  notification: Omit<CreateNotificationInput, 'identityId'>
) {
  if (identityIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: identityIds.map(identityId => ({
        identityId,
        type: notification.type,
        title: notification.title,
        body: notification.body ?? null,
        href: notification.href ?? null,
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[createNotifications] failed:', err);
  }
}
