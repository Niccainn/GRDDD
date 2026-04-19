'use client';

import { useRouter } from 'next/navigation';
import DataView from '@/components/DataView';

type Workflow = {
  id: string;
  name: string;
  status: string;
  updatedAt: string | Date;
  createdAt: string | Date;
  [key: string]: unknown;
};

export default function SystemWorkflowsView({ workflows }: { workflows: Workflow[] }) {
  const router = useRouter();
  const data = workflows.map(w => ({
    id: w.id,
    name: w.name,
    status: w.status,
    updatedAt: w.updatedAt instanceof Date ? w.updatedAt.toISOString() : w.updatedAt,
    createdAt: w.createdAt instanceof Date ? w.createdAt.toISOString() : w.createdAt,
  }));

  async function handleBulkDelete(ids: string[]) {
    // Best-effort parallel delete. We don't block the UI on the
    // slowest one — router.refresh() reconciles whatever made it
    // through. Failures show up as rows that reappear, which is
    // a cleaner recovery story than a blocking error toast.
    await Promise.allSettled(
      ids.map(id => fetch(`/api/workflows/${id}`, { method: 'DELETE' })),
    );
    router.refresh();
  }

  return (
    <DataView
      entityType="workflows"
      data={data}
      defaultView="table"
      compact
      onBulkDelete={handleBulkDelete}
    />
  );
}
