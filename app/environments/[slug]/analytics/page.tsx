'use client';

import { useEffect, useState } from 'react';
import { useEnvironmentWorkspace } from '@/lib/contexts/environment-workspace';
import CampaignAnalyticsWidget from '@/components/widgets/CampaignAnalyticsWidget';
import ROIEffortWidget from '@/components/widgets/ROIEffortWidget';

type AnalyticsData = {
  systems: {
    id: string;
    name: string;
    color: string | null;
    healthScore: number | null;
    executions: number;
  }[];
  executions: {
    id: string;
    status: string;
    createdAt: string;
  }[];
  successRate: number;
  avgHealth: number | null;
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

export default function EnvironmentAnalytics() {
  const { slug, environmentId } = useEnvironmentWorkspace();
  const [data, setData] = useState<AnalyticsData | null>(null);
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
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Failed to load analytics</p>
      </div>
    );
  }

  const totalExecutions = data.executions?.length ?? 0;
  const successCount = data.executions?.filter(e => e.status === 'SUCCESS').length ?? 0;
  const failedCount = data.executions?.filter(e => e.status === 'FAILED').length ?? 0;

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Health Score', value: data.avgHealth !== null ? `${data.avgHealth}%` : '--', color: data.avgHealth && data.avgHealth >= 80 ? '#15AD70' : data.avgHealth && data.avgHealth >= 60 ? '#F7C700' : '#FF5757' },
          { label: 'Success Rate', value: `${data.successRate}%`, color: data.successRate >= 90 ? '#15AD70' : data.successRate >= 70 ? '#F7C700' : '#FF5757' },
          { label: 'Total Executions', value: totalExecutions.toString(), color: 'var(--text-1)' },
          { label: 'Failed', value: failedCount.toString(), color: failedCount > 0 ? '#FF5757' : '#15AD70' },
        ].map(stat => (
          <div
            key={stat.label}
            className="px-5 py-4 rounded-xl"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
          >
            <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>{stat.label}</p>
            <p className="text-2xl font-extralight" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* System health breakdown */}
      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
      >
        <h3 className="text-xs font-light tracking-wide mb-4" style={{ color: 'var(--text-3)' }}>
          SYSTEM HEALTH
        </h3>
        <div className="space-y-3">
          {data.systems.map(sys => (
            <div key={sys.id} className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sys.color ?? 'var(--text-3)' }} />
              <span className="text-xs font-light flex-1 truncate" style={{ color: 'var(--text-2)' }}>{sys.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>{sys.executions} exec</span>
              <div className="w-24 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${sys.healthScore ?? 0}%`,
                    background: (sys.healthScore ?? 0) >= 80 ? '#15AD70' : (sys.healthScore ?? 0) >= 60 ? '#F7C700' : '#FF5757',
                  }}
                />
              </div>
              <span className="text-xs w-8 text-right" style={{
                color: (sys.healthScore ?? 0) >= 80 ? '#15AD70' : (sys.healthScore ?? 0) >= 60 ? '#F7C700' : '#FF5757',
              }}>
                {sys.healthScore ?? '--'}
              </span>
            </div>
          ))}
          {data.systems.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-3)' }}>No systems</p>
          )}
        </div>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CampaignAnalyticsWidget
          analytics={data.campaignAnalytics}
          successRate={data.successRate}
        />
        <ROIEffortWidget environmentId={environmentId} />
      </div>
    </div>
  );
}
