import { prisma } from '@/lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import DeleteButton from '@/components/DeleteButton';

async function createWorkflow(formData: FormData) {
  'use server';
  const name = formData.get('name') as string;
  const systemId = formData.get('systemId') as string;
  const environmentId = formData.get('environmentId') as string;
  if (!name || !systemId || !environmentId) return;
  let identity = await prisma.identity.findFirst({ where: { email: 'demo@grid.app' } });
  if (!identity) identity = await prisma.identity.create({ data: { type: 'PERSON', name: 'Demo User', email: 'demo@grid.app' } });
  const workflow = await prisma.workflow.create({
    data: {
      name, status: 'DRAFT', systemId, environmentId, creatorId: identity.id,
      stages: JSON.stringify([]),
    }
  });
  redirect(`/workflows/${workflow.id}`);
}

export default async function WorkflowsPage() {
  const [workflows, systems, environments] = await Promise.all([
    prisma.workflow.findMany({ include: { system: true, environment: true, _count: { select: { executions: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.system.findMany({ include: { environment: true }, orderBy: { name: 'asc' } }),
    prisma.environment.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const STATUS_COLOR: Record<string, string> = {
    ACTIVE: '#15AD70',
    DRAFT: 'rgba(255,255,255,0.3)',
    PAUSED: '#F7C700',
    COMPLETED: '#7193ED',
    ARCHIVED: 'rgba(255,255,255,0.15)',
  };

  return (
    <div className="px-10 py-10 min-h-screen">
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">Workflows</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Execution logic within systems</p>
        </div>

        {systems.length > 0 && (
          <form action={createWorkflow} className="flex items-center gap-2">
            <input name="name" required placeholder="Workflow name"
              className="text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'white', width: '180px' }} />
            <select name="systemId" required
              className="text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'rgba(255,255,255,0.6)', width: '160px' }}>
              {systems.map(s => (
                <option key={s.id} value={s.id} style={{ background: '#111' }}>{s.name}</option>
              ))}
            </select>
            <select name="environmentId" required
              className="text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'rgba(255,255,255,0.6)', width: '140px' }}>
              {environments.map(e => (
                <option key={e.id} value={e.id} style={{ background: '#111' }}>{e.name}</option>
              ))}
            </select>
            <button type="submit" className="text-xs font-light px-3 py-2 rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
              Create
            </button>
          </form>
        )}
      </div>

      {systems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-secondary)' }}>No systems yet</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>Workflows operate within systems</p>
          <Link href="/systems" className="text-xs font-light px-4 py-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            Create system →
          </Link>
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-secondary)' }}>No workflows yet</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Create one above to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {workflows.map(w => (
            <div key={w.id} className="group flex flex-col justify-between rounded-xl transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Link href={`/workflows/${w.id}`} className="flex flex-col p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: STATUS_COLOR[w.status] ?? 'rgba(255,255,255,0.2)' }} />
                  <span className="text-xs font-light" style={{ color: STATUS_COLOR[w.status] ?? 'rgba(255,255,255,0.3)' }}>
                    {w.status.toLowerCase()}
                  </span>
                </div>
                <p className="text-sm font-light mb-1 group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {w.name}
                </p>
                {w.description && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{w.description}</p>}
              </Link>
              <div className="flex items-center justify-between px-5 pb-4">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{w.system.name}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{w._count.executions} runs</span>
                  <DeleteButton id={w.id} type="workflows" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
