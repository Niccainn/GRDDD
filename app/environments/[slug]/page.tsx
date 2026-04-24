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
import RoiSummaryWidget from '@/components/environments/RoiSummaryWidget';
import TeamAdoptionWidget from '@/components/environments/TeamAdoptionWidget';
import TrustPrimer from '@/components/environments/TrustPrimer';
import ProjectsWidget from '@/components/environments/ProjectsWidget';
import ProjectLauncher from '@/components/projects/ProjectLauncher';
import EnvironmentGlance from '@/components/environments/EnvironmentGlance';

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
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Failed to load environment data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Glance strip — the "who/what" of this environment in one
          read. Sits above everything so users land on the profile,
          not on widgets. */}
      <EnvironmentGlance
        name={data.environment.name}
        slug={data.environment.slug}
        description={data.environment.description}
        color={data.environment.color}
        owner={data.environment.owner}
        systems={data.systems}
        goals={data.goals}
        signals={data.signals}
        executions={data.executions}
        novaLogs={data.novaLogs}
        successRate={data.successRate}
      />
      {/* Canonical artifact — the three surfaces that define the page:
          weekly narrative, exceptions feed, action ledger. They lead
          so screenshots of this page carry the product thesis on
          their own. Everything below is supplementary. */}
      <NovaLearningRibbon environmentId={environmentId} />
      {/* Hero order change (Anthropic-review pass): Project Launcher
          leads, because the interaction layer is the product. The
          narrative + trust primer follow so the Environment page
          reads as "what can I make Nova do" → "here's what Nova's
          done" → "here's how it explains itself". */}
      <ProjectLauncher environmentId={environmentId} />
      <TrustPrimer environmentId={environmentId} />
      <ProjectsWidget environmentId={environmentId} />
      <NarrativeWidget environmentId={environmentId} environmentName={name} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExceptionsWidget environmentId={environmentId} />
        <ActionLedgerWidget environmentId={environmentId} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RoiSummaryWidget environmentId={environmentId} environmentSlug={slug} />
        <TeamAdoptionWidget environmentId={environmentId} />
      </div>
      {/* Primary surfaces — system health + running work + open goals.
          Everything below the fold is now opt-in via the
          <MoreWidgetsDisclosure /> so first-load reads as three-lane
          wedge (narrative · exceptions · ledger) + health + activity,
          not a 15-card dashboard. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SystemHealthWidget systems={data.systems} />
        <ActivityFeedWidget novaLogs={data.novaLogs} signals={data.signals} />
        <WorkflowKanbanWidget executions={data.executions} />
        {data.goals.length > 0 && <GoalsWidget goals={data.goals} />}
      </div>
      <MoreWidgetsDisclosure>
        <IntegrationsWidget environmentId={environmentId} />
        <ReflectiveInsightsWidget environmentId={environmentId} />
        <MasteryWidget environmentId={environmentId} />
        <ROIEffortWidget environmentId={environmentId} />
        <CampaignAnalyticsWidget
          analytics={data.campaignAnalytics}
          successRate={data.successRate}
        />
      </MoreWidgetsDisclosure>
    </div>
  );
}

/**
 * Collapsible section that hides the 5 secondary widgets behind a
 * single click. First-load reads as the wedge (narrative, exceptions,
 * action ledger, health, activity) instead of 15 cards. Power users
 * who want the full dashboard click once; new users don't drown.
 *
 * Kept inline (not a separate component file) because it's specific
 * to this page's widget inventory and doesn't belong in the shared
 * UI primitives.
 */
function MoreWidgetsDisclosure({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div className="flex items-center justify-center">
        <button
          onClick={() => setOpen(true)}
          className="text-[11px] font-light px-4 py-2 rounded-full transition-colors hover:bg-white/[0.04]"
          style={{ border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}
        >
          Show integrations, insights &amp; analytics
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
      <div className="flex items-center justify-center">
        <button
          onClick={() => setOpen(false)}
          className="text-[10px] font-light transition-colors hover:text-white/70"
          style={{ color: 'var(--text-3)' }}
        >
          Collapse
        </button>
      </div>
    </div>
  );
}
