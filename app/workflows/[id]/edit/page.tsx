'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import WorkflowBuilder, { WFNode, WFEdge } from '@/components/workflow/WorkflowBuilder';

type WorkflowData = {
  id: string;
  name: string;
  status: string;
  stages: string[];
  nodes: string | null;
  edges: string | null;
  systemName: string;
  environmentName: string;
};

export default function WorkflowEditPage() {
  const params = useParams();
  const id = params.id as string;

  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/workflows/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setWorkflow)
      .catch(() => setError('Workflow not found'));
  }, [id]);

  async function handleSave(nodes: WFNode[], edges: WFEdge[]) {
    const res = await fetch(`/api/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: JSON.stringify(nodes), edges: JSON.stringify(edges) }),
    });
    if (!res.ok) throw new Error('Save failed');
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#09090b', color: 'rgba(255,255,255,0.5)' }}>
        {error}
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#09090b' }}>
        <span className="text-xs font-light animate-pulse" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading···</span>
      </div>
    );
  }

  return <WorkflowBuilder workflow={workflow} onSave={handleSave} />;
}
