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
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString();
}

function formatMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `$${n.toFixed(2)}`;
}

function roasColor(roas: number): string {
  if (roas >= 2) return '#15AD70';
  if (roas >= 1) return '#F7C700';
  return '#FF5757';
}

// Dot matrix visualization — shows relative scale of metrics
function DotMatrix({ values, colors }: { values: number[]; colors: string[] }) {
  const max = Math.max(...values, 1);
  const cols = 10;
  return (
    <div className="flex items-end gap-3 mt-3 mb-1">
      {values.map((v, i) => {
        const filled = Math.max(1, Math.round((v / max) * 8));
        return (
          <div key={i} className="flex flex-col gap-[2px] items-center">
            {Array.from({ length: 8 }).map((_, row) => (
              <div
                key={row}
                className="w-[5px] h-[5px] rounded-full"
                style={{
                  background: 7 - row < filled ? colors[i] : 'rgba(255,255,255,0.04)',
                  opacity: 7 - row < filled ? 0.7 + (row * 0.04) : 1,
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, color, tag }: { label: string; value: string; color?: string; tag?: string }) {
  return (
    <div className="glass-deep rounded-xl p-2.5 md:p-4 flex flex-col justify-between min-h-[70px] md:min-h-[80px]">
      <div className="flex items-start justify-between gap-1">
        <span className="text-[9px] md:text-[10px] tracking-[0.08em] uppercase truncate" style={{ color: 'var(--text-3)' }}>
          {label}
        </span>
        {tag && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)' }}>
            {tag}
          </span>
        )}
      </div>
      <span className="stat-number" style={{ color: color || 'var(--text-1)' }}>
        {value}
      </span>
    </div>
  );
}

export default function CampaignAnalyticsWidget({ analytics, successRate }: CampaignAnalyticsWidgetProps) {
  return (
    <Widget title="CAMPAIGN PERFORMANCE" span={2}>
      {/* Success rate + dot matrix */}
      <div className="flex items-center justify-between mb-4">
        <DotMatrix
          values={[analytics.impressions, analytics.reach, analytics.engagement, analytics.clicks]}
          colors={['rgba(255,255,255,0.5)', '#7193ED', '#15AD70', '#BF9FF1']}
        />
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: successRate >= 70 ? '#15AD70' : successRate >= 40 ? '#F7C700' : '#FF5757' }} />
          <span className="stat-number text-lg" style={{ color: successRate >= 70 ? '#15AD70' : successRate >= 40 ? '#F7C700' : '#FF5757' }}>
            {successRate}%
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>success</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Impressions" value={formatNumber(analytics.impressions)} />
        <StatCard label="Reach" value={formatNumber(analytics.reach)} />
        <StatCard label="Engagement" value={formatNumber(analytics.engagement)} tag="social" />
        <StatCard label="Clicks" value={formatNumber(analytics.clicks)} />
        <StatCard label="CTR" value={`${analytics.ctr.toFixed(1)}%`} />
        <StatCard label="ROAS" value={`${analytics.roas.toFixed(1)}x`} color={roasColor(analytics.roas)} tag={analytics.roas >= 2 ? 'High' : 'Medium'} />
        <StatCard label="Spend" value={formatMoney(analytics.spend)} />
        <StatCard label="Conversions" value={formatNumber(analytics.conversions)} color="#15AD70" />
      </div>
    </Widget>
  );
}
