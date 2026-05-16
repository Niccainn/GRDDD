---
name: event-sync-wire
description: Use this skill when adding any mutation that changes data displayed in sidebars, lists, switchers, or other surfaces outside the immediate component — or when diagnosing "why didn't the sidebar update after I added X". Implements GRID's event-driven sync tenet (CLAUDE.md): fire `grid:{entity}-changed` after mutations; subscribed components refetch without page reloads.
---

# Skill: event-sync-wire

## When to invoke

- Adding a new mutation that creates/updates/deletes an entity also shown elsewhere
- "Why didn't the sidebar update after I created X?"
- New list/switcher component that should stay live
- Reviewing a PR with new mutations

## The pattern (from CLAUDE.md architecture tenets)

> "Event-driven sync across surfaces. When a model mutates, fire a `grid:{entity}-changed` custom event; any subscribed component re-fetches. Sidebar, lists, switchers stay live without page reloads."

## Procedure

### Producer side (after a successful mutation)

```ts
// In the component that just mutated:
async function createSystem(data: NewSystem) {
  const res = await fetch('/api/systems', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Create failed');
  
  // Fire the sync event so other surfaces know to refetch
  window.dispatchEvent(new CustomEvent('grid:systems-changed'));
  
  return res.json();
}
```

Naming: `grid:` prefix + plural entity name + `-changed`. Examples:
- `grid:systems-changed`
- `grid:environments-changed`
- `grid:integrations-changed`
- `grid:notifications-changed`

### Consumer side (any component that displays this data)

```ts
'use client';
import { useEffect } from 'react';

function SystemsList() {
  const [systems, setSystems] = useState([]);
  
  const refetch = useCallback(() => {
    fetch('/api/systems').then(r => r.json()).then(setSystems);
  }, []);
  
  useEffect(() => { refetch(); }, [refetch]);
  
  // Subscribe to sync events
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener('grid:systems-changed', handler);
    return () => window.removeEventListener('grid:systems-changed', handler);
  }, [refetch]);
  
  return <ul>{systems.map(s => <li key={s.id}>{s.name}</li>)}</ul>;
}
```

## Verification

- After a mutation, every surface displaying that entity refreshes within ~1s
- No page reload was needed
- DevTools Network tab shows the refetch fire
- Closing the window/tab unsubscribes cleanly (no memory leak warnings in console)

## Failure modes

- **Event name typo** — `grid:system-changed` (singular) vs `grid:systems-changed` (plural). No error fires; the listener just never matches. Convention: always plural.
- **Missing cleanup in useEffect** — forgetting the `return () => window.removeEventListener(...)` causes leaks on hot reload + double-fires after navigation. Always pair add + remove.
- **SSR component subscribing** — `window.addEventListener` only runs client-side. Wrap in `'use client'` directive.
- **Cross-tab sync** — `CustomEvent` is window-scoped, doesn't fire in other tabs. For cross-tab, use `BroadcastChannel` or a server-sent-event channel — but most cases don't need cross-tab.
- **Refetch storms** — if 5 components all subscribe + all refetch the same endpoint, you get 5 requests. Consider lifting state up or using a shared cache (SWR, React Query) for hot endpoints.
- **Optimistic UI mismatch** — if the producer optimistically updates local state AND fires the event, the refetch may revert the optimistic state if the server hasn't acked. Either: don't fire until server acks, OR design refetch to merge with optimistic state.

## Owner

`engineer`
