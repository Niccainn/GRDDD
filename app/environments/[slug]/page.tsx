'use client';

import { useEffect, useState } from 'react';
import { useEnvironmentWorkspace } from '@/lib/contexts/environment-workspace';
import SystemHealthWidget from '@/components/widgets/SystemHealthWidget';
import WorkflowKanbanWidget from '@/components/widgets/WorkflowKanbanWidget';
import ActivityFeedWidget from '@/components/widgets/ActivityFeedWidget';
import GoalsWidget from '@/components/widgets/GoalsWidget';
import CampaignAnalyticsWidget from '@/components/widgets/CampaignAnalyticsWidget';
import IntegrationsWidget from '@/components/widgets/IntegrationsWidget';
import ReflectiveInsightsWidget from '@/components/widgets/ReflectiveInsightsWidget';
import ROIEffortWidget from '@/components/widgets/ROIEffortWidget';
import MasteryWidget from '@/components/widgets/MasteryWidget';
import NarrativeWidget from '@/components/environments/NarrativeWidget';
import ExceptionsWidget from '@/components/environments/ExceptionsWidget';
import ActionLedgerWidget from '@/components/environments/ActionLedgerWidget';
import NovaLearningRibbon from '@/components/environments/NovaLearningRibbon';

type DashboardData = {
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

export default function EnvironmentOverview() {
  const { environmentId, slug, name } = useEnvironmentWorkspace();
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Canonical artifact — the three surfaces that define the page:
          weekly narrative, exceptions feed, action ledger. They lead
          so screenshots of this page carry the product thesis on
          their own. Everything below is supplementary. */}
      <NovaLearningRibbon environmentId={environmentId} />
      <NarrativeWidget environmentId={environmentId} environmentName={name} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExceptionsWidget environmentId={environmentId} />
        <ActionLedgerWidget environmentId={environmentId} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SystemHealthWidget systems={data.systems} />
        <ActivityFeedWidget novaLogs={data.novaLogs} signals={data.signals} />
        <WorkflowKanbanWidget executions={data.executions} />
        {data.goals.length > 0 && <GoalsWidget goals={data.goals} />}
        <IntegrationsWidget environmentId={environmentId} />
        <ReflectiveInsightsWidget environmentId={environmentId} />
        <MasteryWidget environmentId={environmentId} />
        <ROIEffortWidget environmentId={environmentId} />
        <CampaignAnalyticsWidget
          analytics={data.campaignAnalytics}
          successRate={data.successRate}
        />
      </div>
    </div>
  );
}
