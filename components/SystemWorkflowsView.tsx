'use client';

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
  const data = workflows.map(w => ({
    id: w.id,
    name: w.name,
    status: w.status,
    updatedAt: w.updatedAt instanceof Date ? w.updatedAt.toISOString() : w.updatedAt,
    createdAt: w.createdAt instanceof Date ? w.createdAt.toISOString() : w.createdAt,
  }));

  return (
    <DataView
      entityType="workflows"
      data={data}
      defaultView="table"
      compact
    />
  );
}
