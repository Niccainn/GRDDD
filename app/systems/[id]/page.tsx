import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import NovaBar from '@/components/NovaBar';
import InlineEdit from '@/components/InlineEdit';
import DeleteButton from '@/components/DeleteButton';
import SystemExecutionChart from '@/components/SystemExecutionChart';
import NovaMemoryPanel from '@/components/NovaMemoryPanel';
import SystemContextDocs from '@/components/SystemContextDocs';
import SystemGoals from '@/components/SystemGoals';
import Breadcrumb from '@/components/Breadcrumb';
import SystemWorkflowsView from '@/components/SystemWorkflowsView';

export const dynamic = 'force-dynamic';

async function createWorkflow(formData: FormData) {
  'use server';
  const systemId = formData.get('systemId') as string;
  const environmentId = formData.get('environmentId') as string;
  const identity = await getAuthIdentity();
  const workflow = await prisma.workflow.create({
    data: {
      name: 'New Workflow', status: 'DRAFT', systemId, environmentId, creatorId: identity.id,
      stages: JSON.stringify([]),
    }
  });
  redirect(`/workflows/${workflow.id}`);
}

async function getSystem(id: string) {
  return prisma.system.findUnique({
    where: { id },
    include: {
      environment: true,
      creator: true,
      workflows: { orderBy: { updatedAt: 'desc' } },
      executions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          workflow: { select: { id: true, name: true } },
          review: { select: { overallScore: true } },
        },
      },
      _count: { select: { executions: true } },
    },
  });
}

async function getSystemSignals(systemId: string) {
  return prisma.signal.findMany({
    where: { systemId, status: { in: ['UNREAD', 'TRIAGED'] } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, title: true, source: true, priority: true, status: true, novaTriaged: true, createdAt: true },
  });
}

async function getSystemIntegrations(environmentId: string) {
  return prisma.integration.findMany({
    where: { environmentId, status: 'ACTIVE' },
    select: { id: true, provider: true, displayName: true, accountLabel: true },
    take: 10,
  });
}

async function getNovaLogs(systemId: string) {
  const logs = await prisma.intelligenceLog.findMany({
    where: { systemId, action: 'nova_query' },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  return logs.map(log => ({
    id: log.id,
    input: log.input ? (() => { try { return JSON.parse(log.input!).query ?? ''; } catch { return log.input ?? ''; } })() : '',
    output: log.output ? (() => { try { return JSON.parse(log.output!).response ?? ''; } catch { return log.output ?? ''; } })() : '',
    createdAt: log.createdAt.toISOString(),
    tokens: log.tokens,
  }));
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#15AD70', DRAFT: 'rgba(255,255,255,0.3)',
  PAUSED: '#F7C700', COMPLETED: '#7193ED', ARCHIVED: 'rgba(255,255,255,0.15)',
};

export default async function SystemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [system, novaLogs] = await Promise.all([getSystem(id), getNovaLogs(id)]);
  if (!system) notFound();

  const [signals, integrations] = await Promise.all([
    getSystemSignals(id),
    getSystemIntegrations(system.environmentId),
  ]);

  const unreviewedRuns = system.executions.filter(e => e.status === 'COMPLETED' && !e.review);
  const PRIORITY_COLOR: Record<string, string> = { URGENT: '#FF5757', HIGH: '#F7C700', NORMAL: 'var(--text-3)', LOW: 'rgba(255,255,255,0.2)' };

  // healthScore is stored as 0–100 integer
  const healthPct = system.healthScore ?? null;
  const healthColor = healthPct === null
    ? 'rgba(255,255,255,0.3)'
    : healthPct >= 80 ? '#15AD70' : healthPct >= 50 ? '#F7C700' : '#FF4D4D';

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
      <Breadcrumb items={[
        { label: 'Systems', href: '/systems' },
        { label: system.environment?.name ?? 'Environment', href: `/environments/${system.environment?.slug ?? ''}` },
        { label: system.name },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {system.color && <div className="w-2 h-2 rounded-full mt-2.5 flex-shrink-0" style={{ backgroundColor: system.color }} />}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extralight tracking-tight mb-1">{system.name}</h1>
            {system.description && (
              <p className="text-sm font-light" style={{ color: 'var(--text-2)' }}>{system.description}</p>
            )}
            <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
              in{' '}
              <Link href={`/environments/${system.environment.slug}`}
                className="transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>
                {system.environment.name}
              </Link>
            </p>
            <div className="flex items-center gap-4 mt-4">
              <InlineEdit
                id={system.id}
                type="systems"
                initialName={system.name}
                initialDescription={system.description}
              />
              <DeleteButton id={system.id} type="systems" redirectTo="/systems" />
            </div>
          </div>
        </div>
        {system.healthScore !== null && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Health</p>
            <p className="text-2xl font-extralight" style={{ color: healthColor }}>
              {Math.round(system.healthScore || 0)}%
            </p>
          </div>
        )}
      </div>

      {/* Nova */}
      <div className="mb-8 rounded-xl p-5" style={{ background: 'var(--glass)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <NovaBar systemId={system.id} systemName={system.name} recentLogs={novaLogs} />
      </div>

      {/* Signals — inbound events for this system */}
      {signals.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>
              SIGNALS <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(191,159,241,0.1)', color: 'var(--nova)' }}>{signals.length}</span>
            </p>
            <Link href="/inbox" className="text-[10px] font-light transition-colors hover:text-white/50" style={{ color: 'var(--text-3)' }}>View all →</Link>
          </div>
          <div className="space-y-1">
            {signals.map(sig => (
              <div key={sig.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                <span className="text-[10px]" style={{ color: 'var(--nova)' }}>&#9889;</span>
                <span className="flex-1 text-xs font-light truncate" style={{ color: 'var(--text-2)' }}>{sig.title}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${PRIORITY_COLOR[sig.priority] || 'var(--text-3)'}15`, color: PRIORITY_COLOR[sig.priority] || 'var(--text-3)' }}>{sig.priority}</span>
                {sig.novaTriaged && <span className="text-[8px]" style={{ color: 'var(--nova)', opacity: 0.5 }}>triaged</span>}
                <span className="text-[9px]" style={{ color: 'var(--text-3)', opacity: 0.4 }}>{sig.source}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Runs with review scores */}
      {system.executions.length > 0 && (
        <div className="mb-6">
          <p className="text-xs tracking-[0.12em] mb-3" style={{ color: 'var(--text-3)' }}>RECENT RUNS</p>
          <div className="space-y-1">
            {system.executions.map(exec => (
              <Link key={exec.id} href={`/workflows/${exec.workflow?.id || ''}`}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg group transition-all"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: exec.status === 'COMPLETED' ? '#15AD70' : exec.status === 'RUNNING' ? '#F7C700' : '#FF6B6B' }} />
                <span className="text-xs font-light truncate flex-1 group-hover:text-white/80 transition-colors" style={{ color: 'var(--text-2)' }}>
                  {exec.workflow?.name || 'Direct run'}
                </span>
                {exec.review ? (
                  <span className="text-[10px] font-light tabular-nums" style={{ color: exec.review.overallScore >= 7 ? '#15AD70' : exec.review.overallScore >= 5 ? '#F7C700' : '#FF6B6B' }}>
                    {exec.review.overallScore}/10
                  </span>
                ) : exec.status === 'COMPLETED' ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(21,173,112,0.08)', color: 'var(--brand)', border: '1px solid rgba(21,173,112,0.15)' }}>
                    needs review
                  </span>
                ) : null}
                <span className="text-[9px]" style={{ color: 'var(--text-3)', opacity: 0.4 }}>
                  {new Date(exec.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Workflows */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>
              WORKFLOWS <span style={{ color: 'var(--text-3)', fontWeight: 300 }}>({system.workflows.length})</span>
            </p>
            <form action={createWorkflow}>
              <input type="hidden" name="systemId" value={system.id} />
              <input type="hidden" name="environmentId" value={system.environmentId} />
              <button type="submit" className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                + New
              </button>
            </form>
          </div>
          {system.workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-xl" style={{ border: '1px dashed var(--glass-border)' }}>
              <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No workflows yet</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Use Nova above or create one manually</p>
            </div>
          ) : (
            <SystemWorkflowsView workflows={system.workflows.map(w => ({
              id: w.id,
              name: w.name,
              status: w.status,
              updatedAt: w.updatedAt.toISOString(),
              createdAt: w.createdAt.toISOString(),
            }))} />
          )}
        </div>

        {/* Meta + Execution chart */}
        <div className="space-y-6">
          <div>
            <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>DETAILS</p>
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              {[
                { label: 'Workflows', value: system.workflows.length },
                { label: 'Active', value: system.workflows.filter(w => w.status === 'ACTIVE').length },
                { label: 'Created by', value: system.creator.name },
                { label: 'Created', value: new Date(system.createdAt).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</span>
                  <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.55)' }}>{value}</span>
                </div>
              ))}
              {system.healthScore !== null && (
                <div className="pt-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>Health</span>
                    <span className="text-xs font-light" style={{ color: healthColor }}>{Math.round(system.healthScore || 0)}%</span>
                  </div>
                  <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, system.healthScore || 0)}%`, backgroundColor: healthColor }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Goals */}
          <SystemGoals systemId={system.id} environmentId={system.environmentId} />

          {/* Nova memory */}
          <NovaMemoryPanel systemId={system.id} />

          {/* Context docs */}
          <SystemContextDocs systemId={system.id} />

          {/* Execution analytics */}
          <SystemExecutionChart systemId={system.id} />

          {/* Connected Integrations */}
          <div>
            <p className="text-xs tracking-[0.12em] mb-3" style={{ color: 'var(--text-3)' }}>CONNECTED</p>
            {integrations.length === 0 ? (
              <Link href="/integrations"
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-light transition-all"
                style={{ background: 'rgba(113,147,237,0.04)', border: '1px dashed rgba(113,147,237,0.15)', color: 'var(--info)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                Connect an integration
              </Link>
            ) : (
              <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                {integrations.map(int => (
                  <div key={int.id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#15AD70' }} />
                    <span className="text-[11px] font-light truncate" style={{ color: 'var(--text-2)' }}>
                      {int.displayName || int.provider}
                    </span>
                  </div>
                ))}
                <Link href="/integrations" className="text-[10px] font-light transition-colors hover:text-white/50 block mt-1" style={{ color: 'var(--text-3)' }}>
                  Manage →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
