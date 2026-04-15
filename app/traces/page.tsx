/**
 * /traces — observability dashboard
 *
 * Lists recent kernel runs and lets you drill into a single trace
 * to see the full event stream: routing decision, every tool call
 * with args + results, text deltas, tokens, cost, errors.
 *
 * This UI is the user-facing answer to "why did Nova do that?" and
 * the developer-facing answer to "what's broken?"
 */

import { getAuthIdentity } from '@/lib/auth';
import { listTraces } from '@/lib/kernel';
import TraceExplorer from './TraceExplorer';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Traces · Nova observability',
  description: 'Every reasoning step, tool call, and decision Nova has made across your organization.',
};

export default async function TracesPage() {
  const identity = await getAuthIdentity();
  const traces = await listTraces({ tenantId: identity.id, limit: 100 });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-2">
            Nova · Observability
          </p>
          <h1 className="text-3xl font-extralight tracking-tight">Traces</h1>
          <p className="text-sm text-white/50 mt-2 max-w-2xl font-light">
            Every kernel run — chat, workflow, scheduler, webhook — with full fidelity.
            Routing decisions, tool calls, tokens, cost, errors. This is the receipt
            for every thought Nova had.
          </p>
        </header>

        <TraceExplorer initialTraces={traces} />
      </div>
    </main>
  );
}
