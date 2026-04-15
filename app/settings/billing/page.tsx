'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type PlanType = 'FREE' | 'PRO' | 'TEAM';

type BillingData = {
  subscription: {
    plan: PlanType;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    stripeCustomerId: string | null;
  };
  planDetails: {
    name: string;
    description: string;
    price: number;
    priceSuffix: string;
  };
  usage: Record<string, number>;
  limits: Record<string, number>;
};

type BetaData = {
  plan: 'BETA';
  status: string;
  beta: true;
  message: string;
};

const PLAN_COLORS: Record<PlanType, string> = {
  FREE: 'rgba(255,255,255,0.15)',
  PRO: 'rgba(99,149,255,0.25)',
  TEAM: 'rgba(168,120,255,0.25)',
};

const PLAN_BADGE_COLORS: Record<PlanType, { bg: string; text: string }> = {
  FREE: { bg: 'rgba(255,255,255,0.08)', text: 'var(--text-3)' },
  PRO: { bg: 'rgba(99,149,255,0.15)', text: '#6395ff' },
  TEAM: { bg: 'rgba(168,120,255,0.15)', text: '#a878ff' },
};

const METRIC_LABELS: Record<string, string> = {
  executions: 'Executions',
  nova_queries: 'Nova queries',
  api_calls: 'API calls',
  storage_mb: 'Storage (MB)',
};

const ALL_FEATURES = [
  { key: 'environments', label: 'Environments', free: '3', pro: '10', team: 'Unlimited' },
  { key: 'systems', label: 'Systems', free: '5', pro: 'Unlimited', team: 'Unlimited' },
  { key: 'executions', label: 'Executions / mo', free: '100', pro: '2,000', team: '10,000' },
  { key: 'nova_queries', label: 'Nova queries / mo', free: '50', pro: '500', team: '2,000' },
  { key: 'api_keys', label: 'API keys', free: '1', pro: '10', team: '50' },
  { key: 'team_members', label: 'Team members', free: '--', pro: '--', team: 'Yes' },
  { key: 'audit_log', label: 'Audit log', free: '--', pro: '--', team: 'Yes' },
  { key: 'priority_support', label: 'Priority support', free: '--', pro: '--', team: 'Yes' },
];

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<BillingData | null>(null);
  const [betaMode, setBetaMode] = useState<BetaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<PlanType | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      setToast('Plan upgraded successfully');
      setTimeout(() => setToast(null), 4000);
    } else if (searchParams.get('canceled') === '1') {
      setToast('Checkout canceled');
      setTimeout(() => setToast(null), 4000);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/billing')
      .then((r) => r.json())
      .then((d) => {
        if (d.beta) {
          setBetaMode(d as BetaData);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleUpgrade(plan: PlanType) {
    setUpgrading(plan);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const { url, error } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setToast(error ?? 'Failed to start checkout');
        setTimeout(() => setToast(null), 4000);
      }
    } catch {
      setToast('Failed to start checkout');
      setTimeout(() => setToast(null), 4000);
    } finally {
      setUpgrading(null);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const { url, error } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setToast(error ?? 'Failed to open billing portal');
        setTimeout(() => setToast(null), 4000);
      }
    } catch {
      setToast('Failed to open billing portal');
      setTimeout(() => setToast(null), 4000);
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', color: 'var(--text-3)' }}>
        <div style={{ fontWeight: 300, letterSpacing: '0.02em' }}>Loading billing...</div>
      </div>
    );
  }

  if (!data && !betaMode) {
    return (
      <div style={{ padding: '3rem', color: 'var(--text-3)' }}>
        <div style={{ fontWeight: 300 }}>Unable to load billing data.</div>
      </div>
    );
  }

  if (betaMode) {
    return (
      <div style={{ padding: '2rem 2.5rem', maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 300,
              color: 'var(--text-1)',
              letterSpacing: '-0.02em',
              marginBottom: 6,
            }}
          >
            Billing
          </h1>
          <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 14 }}>
            Manage your plan, usage, and payment details.
          </p>
        </div>

        {/* Beta Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99,149,255,0.12), rgba(168,120,255,0.08))',
            border: '1px solid rgba(99,149,255,0.2)',
            borderRadius: 20,
            padding: '2.5rem 2rem',
            textAlign: 'center',
            backdropFilter: 'blur(24px)',
            marginBottom: '2rem',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>
            {'\uD83C\uDF89'}
          </div>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 300,
              color: 'var(--text-1)',
              letterSpacing: '-0.02em',
              marginBottom: 8,
            }}
          >
            Free during beta
          </h2>
          <p
            style={{
              color: 'var(--text-2)',
              fontWeight: 300,
              fontSize: 15,
              maxWidth: 440,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            You have full access to all GRID features during the beta period.
            Paid plans will be available soon.
          </p>
        </div>

        {/* Plan Comparison — read-only in beta */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 300,
              color: 'var(--text-1)',
              marginBottom: '1.25rem',
              letterSpacing: '-0.01em',
            }}
          >
            Plans (coming soon)
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {(['FREE', 'PRO', 'TEAM'] as PlanType[]).map((p) => {
              const isHighlight = p === 'PRO';

              return (
                <div
                  key={p}
                  style={{
                    background: 'var(--glass)',
                    border: `1px solid ${isHighlight ? 'rgba(99,149,255,0.3)' : 'var(--glass-border)'}`,
                    borderRadius: 20,
                    padding: '1.75rem 1.5rem',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: 0.7,
                  }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <h3
                      style={{
                        fontSize: 18,
                        fontWeight: 300,
                        color: 'var(--text-1)',
                        marginBottom: 4,
                      }}
                    >
                      {p === 'FREE' ? 'Free' : p === 'PRO' ? 'Pro' : 'Team'}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span
                        style={{
                          fontSize: 36,
                          fontWeight: 200,
                          color: 'var(--text-1)',
                          letterSpacing: '-0.03em',
                        }}
                      >
                        ${p === 'FREE' ? '0' : p === 'PRO' ? '29' : '79'}
                      </span>
                      <span style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 13 }}>
                        {p === 'TEAM' ? '/seat/mo' : '/mo'}
                      </span>
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    {ALL_FEATURES.map((feat) => {
                      const val =
                        p === 'FREE' ? feat.free : p === 'PRO' ? feat.pro : feat.team;
                      const isAvailable = val !== '--';

                      return (
                        <div
                          key={feat.key}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '6px 0',
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                          }}
                        >
                          <span
                            style={{
                              color: isAvailable ? 'var(--text-2)' : 'var(--text-3)',
                              fontWeight: 300,
                              fontSize: 13,
                              opacity: isAvailable ? 1 : 0.5,
                            }}
                          >
                            {feat.label}
                          </span>
                          <span
                            style={{
                              color: isAvailable ? 'var(--text-2)' : 'var(--text-3)',
                              fontWeight: 300,
                              fontSize: 13,
                              opacity: isAvailable ? 1 : 0.4,
                            }}
                          >
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { subscription, usage, limits } = data;
  const plan = subscription.plan;
  const badge = PLAN_BADGE_COLORS[plan];

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            background: 'var(--glass-deep)',
            border: '1px solid var(--glass-border)',
            borderRadius: 12,
            padding: '12px 20px',
            color: 'var(--text-1)',
            fontWeight: 300,
            fontSize: 14,
            zIndex: 9999,
            backdropFilter: 'blur(20px)',
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: 'var(--text-1)',
            letterSpacing: '-0.02em',
            marginBottom: 6,
          }}
        >
          Billing
        </h1>
        <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 14 }}>
          Manage your plan, usage, and payment details.
        </p>
      </div>

      {/* Current Plan Card */}
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20,
          padding: '1.75rem 2rem',
          marginBottom: '2rem',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-1)', fontSize: 20, fontWeight: 300 }}>
                Current plan
              </span>
              <span
                style={{
                  background: badge.bg,
                  color: badge.text,
                  padding: '3px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {plan}
              </span>
              {subscription.cancelAtPeriodEnd && (
                <span
                  style={{
                    background: 'rgba(255,120,100,0.12)',
                    color: '#ff7864',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  Cancels at period end
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 13 }}>
              {data.planDetails.description}
              {subscription.currentPeriodEnd && (
                <span>
                  {' '}&middot; Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
          {subscription.stripeCustomerId && (
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              style={{
                background: 'var(--glass-deep)',
                border: '1px solid var(--glass-border)',
                borderRadius: 12,
                padding: '10px 20px',
                color: 'var(--text-2)',
                fontWeight: 300,
                fontSize: 13,
                cursor: portalLoading ? 'wait' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {portalLoading ? 'Opening...' : 'Manage billing'}
            </button>
          )}
        </div>
      </div>

      {/* Usage Meters */}
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20,
          padding: '1.75rem 2rem',
          marginBottom: '2rem',
          backdropFilter: 'blur(20px)',
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 300,
            color: 'var(--text-1)',
            marginBottom: '1.25rem',
            letterSpacing: '-0.01em',
          }}
        >
          Usage this period
        </h2>
        <div style={{ display: 'grid', gap: 18 }}>
          {['executions', 'nova_queries', 'api_calls'].map((metric) => {
            const current = usage[metric] ?? 0;
            const limit = limits[metric] ?? 0;
            const isUnlimited = limit === null || limit === Infinity || limit > 999999;
            const pct = isUnlimited ? 0 : limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
            const isNearLimit = pct > 80;
            const isOverLimit = pct >= 100;

            const barColor = isOverLimit
              ? '#ff5c46'
              : isNearLimit
                ? '#ffb347'
                : PLAN_COLORS[plan];

            return (
              <div key={metric}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ color: 'var(--text-2)', fontWeight: 300, fontSize: 13 }}>
                    {METRIC_LABELS[metric]}
                  </span>
                  <span style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 12 }}>
                    {current.toLocaleString()}{' '}
                    / {isUnlimited ? 'unlimited' : limit.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: isUnlimited ? '2%' : `${pct}%`,
                      background: barColor,
                      borderRadius: 3,
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Comparison */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 300,
            color: 'var(--text-1)',
            marginBottom: '1.25rem',
            letterSpacing: '-0.01em',
          }}
        >
          Plans
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {(['FREE', 'PRO', 'TEAM'] as PlanType[]).map((p) => {
            const isCurrent = plan === p;
            const isHighlight = p === 'PRO';
            const planBadge = PLAN_BADGE_COLORS[p];

            return (
              <div
                key={p}
                style={{
                  background: isCurrent ? 'var(--glass-deep)' : 'var(--glass)',
                  border: `1px solid ${isHighlight ? 'rgba(99,149,255,0.3)' : 'var(--glass-border)'}`,
                  borderRadius: 20,
                  padding: '1.75rem 1.5rem',
                  backdropFilter: 'blur(20px)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {isCurrent && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 16,
                      background: planBadge.bg,
                      color: planBadge.text,
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Current
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 300,
                      color: 'var(--text-1)',
                      marginBottom: 4,
                    }}
                  >
                    {p === 'FREE' ? 'Free' : p === 'PRO' ? 'Pro' : 'Team'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 200,
                        color: 'var(--text-1)',
                        letterSpacing: '-0.03em',
                      }}
                    >
                      ${p === 'FREE' ? '0' : p === 'PRO' ? '29' : '79'}
                    </span>
                    <span style={{ color: 'var(--text-3)', fontWeight: 300, fontSize: 13 }}>
                      {p === 'TEAM' ? '/seat/mo' : '/mo'}
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, marginBottom: 20 }}>
                  {ALL_FEATURES.map((feat) => {
                    const val =
                      p === 'FREE' ? feat.free : p === 'PRO' ? feat.pro : feat.team;
                    const isAvailable = val !== '--';

                    return (
                      <div
                        key={feat.key}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                        }}
                      >
                        <span
                          style={{
                            color: isAvailable ? 'var(--text-2)' : 'var(--text-3)',
                            fontWeight: 300,
                            fontSize: 13,
                            opacity: isAvailable ? 1 : 0.5,
                          }}
                        >
                          {feat.label}
                        </span>
                        <span
                          style={{
                            color: isAvailable ? 'var(--text-2)' : 'var(--text-3)',
                            fontWeight: 300,
                            fontSize: 13,
                            opacity: isAvailable ? 1 : 0.4,
                          }}
                        >
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {p !== 'FREE' && !isCurrent && (
                  <button
                    onClick={() => handleUpgrade(p)}
                    disabled={upgrading !== null}
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      borderRadius: 12,
                      border: 'none',
                      background:
                        p === 'PRO'
                          ? 'linear-gradient(135deg, rgba(99,149,255,0.25), rgba(99,149,255,0.1))'
                          : 'linear-gradient(135deg, rgba(168,120,255,0.25), rgba(168,120,255,0.1))',
                      color: p === 'PRO' ? '#6395ff' : '#a878ff',
                      fontWeight: 400,
                      fontSize: 14,
                      cursor: upgrading ? 'wait' : 'pointer',
                      transition: 'all 0.2s',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {upgrading === p ? 'Redirecting...' : `Upgrade to ${p === 'PRO' ? 'Pro' : 'Team'}`}
                  </button>
                )}

                {isCurrent && p === 'FREE' && (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'var(--text-3)',
                      fontWeight: 300,
                      fontSize: 13,
                      padding: '10px 0',
                    }}
                  >
                    Your current plan
                  </div>
                )}

                {isCurrent && p !== 'FREE' && (
                  <button
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      borderRadius: 12,
                      border: '1px solid var(--glass-border)',
                      background: 'transparent',
                      color: 'var(--text-3)',
                      fontWeight: 300,
                      fontSize: 13,
                      cursor: portalLoading ? 'wait' : 'pointer',
                    }}
                  >
                    Manage subscription
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
