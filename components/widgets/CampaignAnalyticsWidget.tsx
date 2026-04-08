'use client';

import Widget from './Widget';

type Analytics = {
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

type CampaignAnalyticsWidgetProps = {
  analytics: Analytics;
  successRate: number;
};

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString();
}

function formatMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `$${n.toFixed(2)}`;
}

function formatRate(n: number): string {
  return `${n.toFixed(1)}%`;
}

function roasColor(roas: number): string {
  if (roas >= 2) return '#22c55e';
  if (roas >= 1) return 'var(--warning)';
  return 'var(--danger)';
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="glass rounded-lg p-3 flex flex-col gap-1"
    >
      <span
        className="text-sm font-light tabular-nums"
        style={{ color: color || 'var(--text-1)' }}
      >
        {value}
      </span>
      <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
        {label}
      </span>
    </div>
  );
}

export default function CampaignAnalyticsWidget({ analytics, successRate }: CampaignAnalyticsWidgetProps) {
  return (
    <Widget title="CAMPAIGN PERFORMANCE" span={2}>
      {/* Success rate indicator */}
      <div className="flex justify-end -mt-2 mb-3">
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: successRate >= 70 ? '#22c55e' : successRate >= 40 ? 'var(--warning)' : 'var(--danger)' }}
          />
          <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
            {formatRate(successRate)} success
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Impressions" value={formatNumber(analytics.impressions)} />
        <StatCard label="Reach" value={formatNumber(analytics.reach)} />
        <StatCard label="Engagement" value={formatNumber(analytics.engagement)} />
        <StatCard label="Clicks" value={formatNumber(analytics.clicks)} />
        <StatCard label="CTR" value={formatRate(analytics.ctr)} />
        <StatCard label="ROAS" value={`${analytics.roas.toFixed(1)}x`} color={roasColor(analytics.roas)} />
        <StatCard label="Spend" value={formatMoney(analytics.spend)} />
        <StatCard label="Conversions" value={formatNumber(analytics.conversions)} />
      </div>
    </Widget>
  );
}
