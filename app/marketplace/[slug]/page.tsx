import { notFound, redirect } from 'next/navigation';
import { getWorkflow, specDepth, specToolCount } from '@/lib/workflows';
import { getAuthIdentityOrNull } from '@/lib/auth';
import WorkflowRunner from './WorkflowRunner';

export const dynamic = 'force-dynamic';

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const identity = await getAuthIdentityOrNull();
  if (!identity) redirect('/sign-in');

  const { slug } = await params;
  const spec = getWorkflow(slug);
  if (!spec) notFound();

  const depth = specDepth(spec);
  const toolCount = specToolCount(spec);

  return (
    <div className="min-h-screen ambient-bg px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <a
          href="/marketplace"
          className="text-xs mb-6 inline-block font-light"
          style={{ color: 'var(--text-3)' }}
        >
          ← Marketplace
        </a>

        <header className="mb-10">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>
            {spec.category} · v{spec.version}
          </p>
          <h1 className="text-3xl font-light mb-3" style={{ color: 'var(--text-1)' }}>
            {spec.name}
          </h1>
          <p className="text-base font-light max-w-2xl" style={{ color: 'var(--text-2)' }}>
            {spec.tagline}
          </p>
          {spec.description && (
            <p className="text-sm font-light mt-4 max-w-2xl" style={{ color: 'var(--text-3)' }}>
              {spec.description}
            </p>
          )}

          <div className="flex flex-wrap gap-6 mt-6 text-xs font-light" style={{ color: 'var(--text-3)' }}>
            <span>{spec.stages.length} stages</span>
            <span>depth: {depth}</span>
            <span>{toolCount} tool{toolCount === 1 ? '' : 's'}</span>
            <span>trigger: {spec.trigger.type}</span>
          </div>
        </header>

        <WorkflowRunner spec={spec} />
      </div>
    </div>
  );
}
