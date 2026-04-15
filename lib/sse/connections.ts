type SSEConnection = {
  identityId: string;
  controller: ReadableStreamDefaultController;
  currentPage: string;
  connectedAt: Date;
};

const connections = new Map<string, SSEConnection>();

export function addConnection(
  id: string,
  identityId: string,
  controller: ReadableStreamDefaultController
) {
  connections.set(id, {
    identityId,
    controller,
    currentPage: '/dashboard',
    connectedAt: new Date(),
  });
}

export function removeConnection(id: string) {
  connections.delete(id);
}

export function getConnections(): Map<string, SSEConnection> {
  return connections;
}

export function updateConnectionPage(id: string, page: string) {
  const conn = connections.get(id);
  if (conn) {
    conn.currentPage = page;
  }
}

export function broadcast(event: string, data: unknown, excludeId?: string) {
  const encoder = new TextEncoder();
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = encoder.encode(payload);

  for (const [id, conn] of connections) {
    if (id === excludeId) continue;
    try {
      conn.controller.enqueue(encoded);
    } catch {
      // Connection closed — clean up
      connections.delete(id);
    }
  }
}

export function sendTo(identityId: string, event: string, data: unknown) {
  const encoder = new TextEncoder();
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = encoder.encode(payload);

  for (const [id, conn] of connections) {
    if (conn.identityId !== identityId) continue;
    try {
      conn.controller.enqueue(encoded);
    } catch {
      connections.delete(id);
    }
  }
}

export function getOnlineUsers(): Array<{
  identityId: string;
  currentPage: string;
  connectedAt: Date;
}> {
  const seen = new Map<string, { identityId: string; currentPage: string; connectedAt: Date }>();

  for (const conn of connections.values()) {
    // Keep the most recent connection per identity
    const existing = seen.get(conn.identityId);
    if (!existing || conn.connectedAt > existing.connectedAt) {
      seen.set(conn.identityId, {
        identityId: conn.identityId,
        currentPage: conn.currentPage,
        connectedAt: conn.connectedAt,
      });
    }
  }

  return Array.from(seen.values());
}
