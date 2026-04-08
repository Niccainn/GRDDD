'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Breadcrumb from '@/components/Breadcrumb';
import SystemHealthWidget from '@/components/widgets/SystemHealthWidget';
import WorkflowKanbanWidget from '@/components/widgets/WorkflowKanbanWidget';
import ActivityFeedWidget from '@/components/widgets/ActivityFeedWidget';
import GoalsWidget from '@/components/widgets/GoalsWidget';
import CampaignAnalyticsWidget from '@/components/widgets/CampaignAnalyticsWidget';

type DashboardData = {
  environment: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    color: string | null;
    owner: string;
    createdAt: string;
  };
  systems: {
    id: string;
    name: string;
    color: string | null;
    healthScore: number | null;
    description: string | null;
    workflows: number;
    activeWorkflows: number;
    executions: number;
  }[];
  executions: {
    id: string;
    status: string;
    input: string;
    createdAt: string;
    completedAt: string | null;
    systemName: string;
    systemColor: string | null;
    workflowName: string | null;
  }[];
  goals: {
    id: string;
    title: string;
    status: string;
    progress: number | null;
    target: string | null;
    current: string | null;
    metric: string | null;
    dueDate: string | null;
    systemName: string;
    systemColor: string | null;
  }[];
  signals: {
    id: string;
    title: string;
    body: string | null;
    source: string;
    priority: string;
    status: string;
    createdAt: string;
    systemName: string | null;
  }[];
  novaLogs: {
    id: string;
    input: string;
    output: string;
    tokens: number | null;
    createdAt: string;
    systemName: string | null;
    systemColor: string | null;
  }[];
  avgHealth: number | null;
  successRate: number;
  campaignAnalytics: {
    impressions: number;
    reach: number;
    engagement: number;
    engagementRate: number;
    clicks: number;
    ctr: number;
    spend: number;
    roas: number;
    conversions: number;
  };
};

export default function EnvironmentDashboard() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/environments/${slug}/dashboard`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="px-10 py-10 min-h-screen">
        <div className="h-8 w-48 rounded-lg animate-pulse mb-8" style={{ background: 'var(--glass)' }} />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.environment) {
    return (
      <div className="px-10 py-10 min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--text-3)' }}>Environment not found</p>
      </div>
    );
  }

  const env = data.environment;

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Environments', href: '/environments' },
        { label: env.name },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          {env.color && (
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: env.color }} />
          )}
          <div>
            <h1 className="text-2xl font-extralight tracking-tight mb-1">{env.name}</h1>
            {env.description && (
              <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>{env.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.avgHealth !== null && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: data.avgHealth >= 80 ? 'rgba(21,173,112,0.08)' : data.avgHealth >= 60 ? 'rgba(247,199,0,0.08)' : 'rgba(255,87,87,0.08)',
                border: `1px solid ${data.avgHealth >= 80 ? 'rgba(21,173,112,0.2)' : data.avgHealth >= 60 ? 'rgba(247,199,0,0.2)' : 'rgba(255,87,87,0.2)'}`,
              }}>
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: data.avgHealth >= 80 ? '#15AD70' : data.avgHealth >= 60 ? '#F7C700' : '#FF5757' }} />
              <span className="text-xs font-light"
                style={{ color: data.avgHealth >= 80 ? '#15AD70' : data.avgHealth >= 60 ? '#F7C700' : '#FF5757' }}>
                {data.avgHealth}% health
              </span>
            </div>
          )}
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>
            {data.systems.length} system{data.systems.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Row 1: System Health + Activity Feed */}
        <SystemHealthWidget systems={data.systems} />
        <ActivityFeedWidget novaLogs={data.novaLogs} signals={data.signals} />

        {/* Row 2: Kanban (full width) */}
        <WorkflowKanbanWidget executions={data.executions} />

        {/* Row 3: Goals + Campaign Analytics */}
        {data.goals.length > 0 && (
          <GoalsWidget goals={data.goals} />
        )}
        <CampaignAnalyticsWidget
          analytics={data.campaignAnalytics}
          successRate={data.successRate}
        />
      </div>
    </div>
  );
}
