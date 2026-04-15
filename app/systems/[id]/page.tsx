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
      _count: { select: { executions: true } },
    },
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
        </div>
      </div>
    </div>
  );
}
