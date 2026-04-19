/**
 * /subprocessors — GDPR Article 28 transparency page.
 *
 * Lists every third party that processes personal data on behalf of
 * GRID, what data they see, and where they're located. Required
 * reading for any EU user exercising Art. 15 right-of-access and any
 * enterprise buyer's DPA review.
 *
 * Keep this page current: bumping POLICY_VERSION in lib/consent/log.ts
 * alongside material changes to the subprocessor list is what
 * triggers the re-consent prompt under Art. 7.
 *
 * This is a server component — no JS shipped, no user data on page,
 * fully cacheable.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: 'Subprocessors',
  description:
    'Third-party services that process personal data on behalf of GRID. Full GDPR Art. 28 transparency.',
};

type Subprocessor = {
  name: string;
  purpose: string;
  dataCategories: string;
  region: string;
  dpa: string;
};

const SUBPROCESSORS: Subprocessor[] = [
  {
    name: 'Anthropic',
    purpose: 'LLM inference for Nova and workflow stages (user BYOK for most flows)',
    dataCategories: 'Prompts, responses, workflow inputs',
    region: 'United States',
    dpa: 'https://www.anthropic.com/legal/dpa',
  },
  {
    name: 'Vercel',
    purpose: 'Application hosting, edge network, build pipeline',
    dataCategories: 'Request metadata, server logs, no direct user data stored on Vercel',
    region: 'United States (edge: global)',
    dpa: 'https://vercel.com/legal/dpa',
  },
  {
    name: 'Turso / Neon / Supabase (primary database)',
    purpose: 'Primary data store (Postgres)',
    dataCategories: 'All user data: identity, workspaces, systems, workflows, signals, tasks',
    region: 'Configurable per deployment — current prod: US-East',
    dpa: 'Provider-specific; linked in internal DPA template',
  },
  {
    name: 'Resend',
    purpose: 'Transactional email: verification, password reset, notifications',
    dataCategories: 'Email address, user name, email body content',
    region: 'United States',
    dpa: 'https://resend.com/legal/dpa',
  },
  {
    name: 'Stripe (when billing is active)',
    purpose: 'Payment processing, subscription management',
    dataCategories: 'Name, email, billing address, payment instrument token (never raw card)',
    region: 'United States / Ireland',
    dpa: 'https://stripe.com/legal/dpa',
  },
  {
    name: 'OAuth providers (Google, GitHub, etc.) — per-user',
    purpose: 'User-initiated OAuth authentication + integration sync',
    dataCategories: 'Access tokens (encrypted at rest), profile data returned by provider',
    region: 'Provider-specific',
    dpa: 'Provider terms accepted by the user at connection time',
  },
  {
    name: 'Upstash (when configured)',
    purpose: 'Distributed rate-limiting backend',
    dataCategories: 'Rate-limit counters keyed on IP-hash + user-id-hash. No PII.',
    region: 'United States',
    dpa: 'https://upstash.com/trust',
  },
  {
    name: 'UptimeRobot (monitoring, operator-configured)',
    purpose: 'External uptime probing on /api/health',
    dataCategories: 'HTTP response metadata only; no user data',
    region: 'United States',
    dpa: 'https://uptimerobot.com/terms/',
  },
];

export default function SubprocessorsPage() {
  return (
    <div className="min-h-screen px-5 md:px-8 py-20 md:py-28">
      <div className="max-w-3xl mx-auto">
        <p
          className="text-[10px] tracking-[0.16em] uppercase mb-3 font-light"
          style={{ color: 'var(--text-3)' }}
        >
          GDPR Article 28 Transparency
        </p>
        <h1 className="text-3xl md:text-4xl font-extralight tracking-tight mb-4">
          Subprocessors
        </h1>
        <p className="text-sm font-light leading-relaxed mb-8" style={{ color: 'var(--text-2)' }}>
          GRID relies on the third parties below to deliver specific parts of the service. Each
          has its own Data Processing Agreement accepted by GRID; the table notes what data
          category each processor sees and where they're hosted. If you're in the EU/EEA and
          exercising a right-of-access, this is the authoritative list as of the page footer
          date.
        </p>

        <div className="glass-deep rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr
                className="text-[10px] tracking-[0.16em] uppercase font-light"
                style={{
                  color: 'var(--text-3)',
                  borderBottom: '1px solid var(--glass-border)',
                }}
              >
                <th className="py-3 px-4">Subprocessor</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4 hidden md:table-cell">Region</th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map((sp) => (
                <tr
                  key={sp.name}
                  className="text-xs font-light align-top"
                  style={{ borderBottom: '1px solid var(--glass-border)' }}
                >
                  <td className="py-4 px-4" style={{ color: 'var(--text-1)' }}>
                    <div className="mb-1">{sp.name}</div>
                    <a
                      href={sp.dpa}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[10px]"
                      style={{ color: 'var(--brand)' }}
                    >
                      DPA →
                    </a>
                  </td>
                  <td className="py-4 px-4 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                    <div className="mb-1.5">{sp.purpose}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                      {sp.dataCategories}
                    </div>
                  </td>
                  <td className="py-4 px-4 hidden md:table-cell" style={{ color: 'var(--text-3)' }}>
                    {sp.region}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-xs tracking-[0.16em] uppercase font-light mt-10 mb-3" style={{ color: 'var(--text-3)' }}>
          When this list changes
        </h2>
        <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
          When we add, remove, or replace a subprocessor in a way that could reasonably concern
          a user (e.g. a data-category or regional change), we update this page and bump the
          policy version recorded in every new user's consent log. Users are prompted to re-accept
          the Terms on their next sign-in. If you have a pending DPA signature with GRID, we
          notify you 30 days before the change takes effect.
        </p>

        <h2 className="text-xs tracking-[0.16em] uppercase font-light mt-10 mb-3" style={{ color: 'var(--text-3)' }}>
          Objecting to a subprocessor
        </h2>
        <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Enterprise customers may object to a new subprocessor within 30 days of notice by
          emailing <span style={{ color: 'var(--text-1)' }}>privacy@grid.systems</span>. Individual users
          exercising Art. 21 right-to-object may either disconnect the relevant integration
          (where provider-specific) or{' '}
          <Link href="/api/account/delete" style={{ color: 'var(--brand)' }}>delete their account</Link>.
        </p>

        <p className="text-[10px] mt-10 font-light" style={{ color: 'var(--text-3)' }}>
          Last updated: 2026-04-19 · See also{' '}
          <Link href="/privacy" style={{ color: 'var(--text-2)' }}>Privacy Policy</Link>,{' '}
          <Link href="/terms" style={{ color: 'var(--text-2)' }}>Terms</Link>,{' '}
          <Link href="/security" style={{ color: 'var(--text-2)' }}>Security</Link>.
        </p>
      </div>
      <LegalFooter />
    </div>
  );
}
