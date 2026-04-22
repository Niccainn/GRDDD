/**
 * /security/controls — SOC2-readiness controls inventory.
 *
 * Public, static, fully cacheable. Written so enterprise procurement teams
 * can get 80% of their diligence answers without a human on the call.
 * Listed controls are what we actually have in code today; anything
 * still-in-progress is marked honestly.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: 'Security controls · GRID',
  description:
    'Inventory of the controls GRID implements today. Written for security reviewers and enterprise procurement teams.',
};

type Control = {
  id: string;
  area: string;
  title: string;
  summary: string;
  status: 'shipped' | 'partial' | 'planned';
  evidence?: string;
};

const CONTROLS: Control[] = [
  {
    id: 'AC-01',
    area: 'Access control',
    title: 'Role-based access within Environments',
    summary:
      'Every Environment has an Owner plus memberships scoped to Admin, Contributor, or Viewer. The API enforces owner-only writes on Environment-level mutations.',
    status: 'shipped',
    evidence: 'EnvironmentMembership model · assertOwnsEnvironment helper',
  },
  {
    id: 'AC-02',
    area: 'Access control',
    title: 'Per-route role enforcement',
    summary:
      'Route-level role checks (ADMIN / CONTRIBUTOR / VIEWER) are being fanned out from the current Environment-owner gate to all downstream routes.',
    status: 'partial',
  },
  {
    id: 'AC-03',
    area: 'Access control',
    title: 'SSO via OIDC',
    summary:
      'Google and Microsoft sign-in available; additional OIDC providers (Okta, Azure AD) integrate via the same Auth.js surface.',
    status: 'partial',
  },
  {
    id: 'AC-04',
    area: 'Access control',
    title: 'SCIM 2.0 provisioning',
    summary:
      'Automated directory provisioning for enterprise identity providers. Built on demand for enterprise deals that require it.',
    status: 'planned',
  },
  {
    id: 'AU-01',
    area: 'Audit',
    title: 'Audit log',
    summary:
      'Every workflow, execution, member change, integration change, and Nova query is recorded in the AuditLog with before/after JSON diffs.',
    status: 'shipped',
    evidence: 'AuditLog model · /audit page · CSV export endpoint',
  },
  {
    id: 'AU-02',
    area: 'Audit',
    title: 'Autonomous action trace',
    summary:
      'Every Nova action persists a KernelTrace including tools called, data read, and the rationale. Surface-facing “why did Nova do this?” panel exposes the trace inline.',
    status: 'shipped',
    evidence: 'KernelTrace · IntelligenceLog models',
  },
  {
    id: 'AU-03',
    area: 'Audit',
    title: 'Tamper-evident monthly reports',
    summary:
      'Signed monthly ROI reports for finance review. Hash of the month’s AuditLog entries embedded in the PDF so the report is verifiable after the fact.',
    status: 'partial',
  },
  {
    id: 'CR-01',
    area: 'Cryptography',
    title: 'Encryption in transit',
    summary: 'TLS 1.2+ for all HTTP traffic. HSTS with preload.',
    status: 'shipped',
  },
  {
    id: 'CR-02',
    area: 'Cryptography',
    title: 'Encryption at rest',
    summary:
      'Primary datastore is encrypted at rest via the managed provider. Secrets (integration tokens, email verification, invite tokens) are stored as SHA-256 hashes or envelope-encrypted blobs.',
    status: 'shipped',
    evidence: 'lib/email-verification.ts · lib/invitations.ts · lib/keys',
  },
  {
    id: 'CR-03',
    area: 'Cryptography',
    title: 'Customer-managed keys (CMK / BYOK)',
    summary:
      'Available on enterprise plans. Built on request for the first customer that contractually requires it.',
    status: 'planned',
  },
  {
    id: 'CO-01',
    area: 'Consent & privacy',
    title: 'Consent log',
    summary:
      'Every consent event (signup, marketing, analytics, data-processing, third-party share) is recorded with policy version, hashed IP, and truncated user-agent. Re-consent triggers on policy-version bumps.',
    status: 'shipped',
    evidence: 'ConsentLog model · lib/consent/log.ts',
  },
  {
    id: 'CO-02',
    area: 'Consent & privacy',
    title: 'Scoped consent per data class',
    summary:
      'Consent scoped by integration and data class (e.g., Gmail read vs Gmail send). The UI exposes this per-integration rather than as a single global toggle.',
    status: 'partial',
  },
  {
    id: 'CO-03',
    area: 'Consent & privacy',
    title: 'Data residency',
    summary:
      'Regional data planes for EU / UK / US. Planned for the first enterprise deal whose MSA requires it.',
    status: 'planned',
  },
  {
    id: 'CH-01',
    area: 'Change management',
    title: 'Reversible-by-default autonomy',
    summary:
      'Every autonomous action at Level 3+ creates a compensating PendingAction that can be undone within a 24-hour window.',
    status: 'shipped',
    evidence: 'PendingAction model · AutonomyConfig model',
  },
  {
    id: 'CH-02',
    area: 'Change management',
    title: 'Per-scope autonomy (5 levels)',
    summary:
      'Observe → Suggest → Act & Notify → Autonomous → Self-Direct. Configurable per Workflow and per System. Recommendation engine surfaces upgrades based on approval rate.',
    status: 'shipped',
    evidence: 'AutonomyConfig · Nova Trust Score',
  },
  {
    id: 'AP-01',
    area: 'Approvals',
    title: 'Multi-step approval chains',
    summary:
      'ApprovalRequest supports multi-step chains with per-step reviewer assignment, status, and comments.',
    status: 'shipped',
  },
  {
    id: 'VM-01',
    area: 'Vulnerability management',
    title: 'Dependency monitoring',
    summary:
      'Automated CVE scanning on every push via the hosting provider’s advisory feed. Dependabot-equivalent PRs for high-severity CVEs.',
    status: 'shipped',
  },
  {
    id: 'VM-02',
    area: 'Vulnerability management',
    title: 'Responsible disclosure',
    summary:
      'Public security.txt and disclosure page. 48-hour acknowledgement commitment.',
    status: 'shipped',
    evidence: '/security · /.well-known/security.txt',
  },
  {
    id: 'AV-01',
    area: 'Availability',
    title: 'Rate limiting',
    summary:
      'Per-identity rate limiting on all authenticated API routes. Limits are per-role and can be lifted per-customer.',
    status: 'shipped',
    evidence: 'lib/rate-limit.ts · rateLimitApi',
  },
  {
    id: 'AV-02',
    area: 'Availability',
    title: 'Backup & recovery',
    summary:
      'Automated daily Postgres snapshots with 30-day retention. Restore rehearsed monthly.',
    status: 'shipped',
  },
];

const STATUS_META: Record<Control['status'], { label: string; color: string; bg: string; border: string }> = {
  shipped: { label: 'Shipped', color: '#C8F26B', bg: 'rgba(200,242,107,0.08)', border: 'rgba(200,242,107,0.2)' },
  partial: { label: 'In progress', color: '#F5D76E', bg: 'rgba(245,215,110,0.08)', border: 'rgba(245,215,110,0.2)' },
  planned: { label: 'On request', color: '#7193ED', bg: 'rgba(113,147,237,0.08)', border: 'rgba(113,147,237,0.2)' },
};

const AREAS = Array.from(new Set(CONTROLS.map(c => c.area)));

export default function ControlsPage() {
  return (
    <div className="min-h-screen px-5 md:px-8 py-20 md:py-28">
      <div className="max-w-3xl mx-auto">
        <p
          className="text-[10px] tracking-[0.16em] uppercase mb-3 font-light"
          style={{ color: 'var(--text-3)' }}
        >
          Security · Controls
        </p>
        <h1 className="text-3xl md:text-4xl font-extralight tracking-tight mb-4">
          What we have, what we're finishing, what we'll build on request
        </h1>
        <p className="text-sm font-light leading-relaxed mb-10" style={{ color: 'var(--text-2)' }}>
          An honest inventory of GRID's security posture. Written so a procurement team can answer
          80% of their diligence questions without a call. Each control lists what's actually
          running in production, not what's in a deck. If something you need isn't here and isn't
          listed as planned, write to us — most enterprise gaps close in the first contract.
        </p>

        {AREAS.map(area => (
          <section key={area} className="mb-10">
            <h2
              className="text-xs font-light tracking-[0.16em] uppercase mb-4"
              style={{ color: 'var(--text-3)' }}
            >
              {area}
            </h2>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
            >
              {CONTROLS.filter(c => c.area === area).map((c, i, arr) => {
                const meta = STATUS_META[c.status];
                return (
                  <div
                    key={c.id}
                    className="px-5 py-4"
                    style={{
                      borderBottom:
                        i < arr.length - 1 ? '1px solid var(--glass-border)' : 'none',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="text-[10px] font-light tracking-wider"
                          style={{ color: 'var(--text-3)' }}
                        >
                          {c.id}
                        </span>
                        <p className="text-sm font-light truncate" style={{ color: 'var(--text-1)' }}>
                          {c.title}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-light tracking-wider uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          color: meta.color,
                          background: meta.bg,
                          border: `1px solid ${meta.border}`,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p
                      className="text-xs font-light leading-relaxed"
                      style={{ color: 'var(--text-2)' }}
                    >
                      {c.summary}
                    </p>
                    {c.evidence && (
                      <p
                        className="text-[11px] font-light mt-1.5"
                        style={{ color: 'var(--text-3)' }}
                      >
                        Evidence: {c.evidence}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div
          className="mt-14 p-6 rounded-2xl"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Need a control that isn't listed, or an expedited SOC2 Type II? Email{' '}
            <a
              href="mailto:security@grid.app"
              style={{ color: 'var(--brand)', textDecoration: 'none' }}
            >
              security@grid.app
            </a>
            . The public disclosure process lives on the{' '}
            <Link href="/security" style={{ color: 'var(--brand)', textDecoration: 'none' }}>
              security page
            </Link>
            .
          </p>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
