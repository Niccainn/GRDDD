/**
 * /legal/dpa — Data Processing Addendum.
 *
 * Plain-English DPA template. A procurement reviewer can read this
 * in ten minutes and hand it to legal. The contractual version is
 * the one actually signed; this page is the public mirror so the
 * substance is transparent and the answers to common questions
 * don't bottleneck on a sales meeting.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '@/components/LegalFooter';

export const metadata: Metadata = {
  title: 'Data Processing Addendum — GRID',
  description:
    'Plain-English DPA covering subprocessors, data categories, security controls, retention, international transfers, and incident response. The signed contract mirrors this language.',
};

type Section = {
  id: string;
  title: string;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: 'parties',
    title: 'Parties and scope',
    body: (
      <>
        <p>
          This Addendum forms part of the Master Services Agreement between
          <strong> GRID Systems Inc.</strong> ("Processor") and the customer
          organization identified in the agreement ("Controller"). It governs
          Processor's handling of Personal Data processed on behalf of Controller.
        </p>
        <p>
          Terms not defined here take their meaning from applicable data protection
          law (GDPR, UK GDPR, CCPA/CPRA).
        </p>
      </>
    ),
  },
  {
    id: 'categories',
    title: 'Categories of data and data subjects',
    body: (
      <>
        <p>
          Processor processes the following categories of Personal Data on
          Controller's behalf:
        </p>
        <ul>
          <li>Identifiers: user name, work email, hashed IP, truncated user-agent.</li>
          <li>Authentication artifacts: password hash, session token, SSO tokens.</li>
          <li>Workspace content: documents, messages, tasks, meetings, goals, and AI outputs explicitly entered or generated within GRID.</li>
          <li>Integration content: data pulled from connected third-party services per the Controller's active connections.</li>
          <li>Telemetry: audit logs, rate-limit counters, usage metrics — scoped per Environment.</li>
        </ul>
        <p>
          Data subjects include Controller's employees, contractors, and the third
          parties with whom they interact through Controller's use of GRID.
        </p>
      </>
    ),
  },
  {
    id: 'purpose',
    title: 'Purpose and processing instructions',
    body: (
      <>
        <p>
          Processor processes Personal Data only to (a) provide, maintain, and
          improve GRID for Controller, (b) execute the automations Controller
          configures, (c) fulfil Controller's documented instructions, and
          (d) comply with applicable law.
        </p>
        <p>
          Processor will not sell Personal Data, will not use it for cross-context
          behavioural advertising, and will not use it to train general-purpose AI
          models for any third party.
        </p>
      </>
    ),
  },
  {
    id: 'subprocessors',
    title: 'Subprocessors',
    body: (
      <>
        <p>
          Current subprocessors:
        </p>
        <ul>
          <li><strong>Anthropic</strong> — AI inference; US region. Controllers may supply their own Anthropic API key (BYOK) to isolate inference traffic to their own Anthropic account.</li>
          <li><strong>Vercel</strong> — application hosting and edge CDN; US region.</li>
          <li><strong>Neon / Turso</strong> — primary Postgres; US region by default, with EU and UK regions available on the Enterprise tier.</li>
          <li><strong>Resend</strong> — transactional email delivery.</li>
          <li><strong>OAuth providers</strong> — scoped per integration connected by the Controller (Google, Microsoft, Notion, Slack, Meta, LinkedIn, etc.).</li>
        </ul>
        <p>
          Processor will notify Controller at least 30 days before adding a new
          subprocessor and will give Controller a reasonable opportunity to object.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security measures',
    body: (
      <>
        <p>
          Processor maintains the technical and organizational measures detailed at{' '}
          <Link href="/security/controls" style={{ color: 'var(--brand)' }}>/security/controls</Link>, which include at minimum:
        </p>
        <ul>
          <li>Encryption in transit (TLS 1.2+) and at rest (managed Postgres encryption plus application-layer envelope encryption for credentials and AI keys).</li>
          <li>Per-tenant logical isolation scoped to the Environment.</li>
          <li>Role-based access control (Owner, Admin, Contributor, Viewer).</li>
          <li>Full audit logging of mutations and AI actions, exportable by the Controller.</li>
          <li>Reversible-by-default autonomous actions with a 24-hour undo window.</li>
          <li>Per-identity rate limiting and per-Environment budget caps.</li>
          <li>Published responsible-disclosure policy at <Link href="/security" style={{ color: 'var(--brand)' }}>/security</Link>.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'transfers',
    title: 'International transfers',
    body: (
      <>
        <p>
          Where Personal Data is transferred from the EEA, UK, or Switzerland to a
          country without an adequacy decision, the transfer is governed by the
          applicable <strong>Standard Contractual Clauses</strong> (Module Two —
          Controller to Processor) and the UK Addendum as applicable.
        </p>
        <p>
          Controllers on the Enterprise tier may elect data residency in EU or UK
          regions to avoid cross-border transfer of Personal Data at rest.
        </p>
      </>
    ),
  },
  {
    id: 'subject-rights',
    title: 'Data subject rights',
    body: (
      <>
        <p>
          Processor will assist Controller in responding to data subject requests
          (access, rectification, erasure, restriction, portability, objection).
          Most requests can be fulfilled by the Controller directly through the
          GRID interface (<code>/audit/export</code>, Environment delete,
          workspace-level data export).
        </p>
        <p>
          Where Processor's assistance is required, Processor will respond within
          the timeframes required by applicable law at no additional charge for
          reasonable volumes.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Retention and deletion',
    body: (
      <>
        <p>
          Personal Data is retained for the duration of the MSA. Controller can
          delete specific records at any time through the UI. Deleting an
          Environment soft-deletes for 30 days (recoverable), then permanently
          purges — including backups — within 60 days, subject to legal hold.
        </p>
        <p>
          On termination of the MSA, Processor will delete or return all Personal
          Data at Controller's election within 60 days, except as required by
          applicable law (tax/audit retention windows).
        </p>
      </>
    ),
  },
  {
    id: 'incidents',
    title: 'Incident notification',
    body: (
      <>
        <p>
          Processor will notify Controller without undue delay — and in any event
          within 72 hours — of any <strong>Security Incident</strong> affecting
          Personal Data. Notifications include the nature of the incident, the
          categories and approximate number of data subjects affected, the likely
          consequences, and the measures taken or proposed to address it.
        </p>
      </>
    ),
  },
  {
    id: 'audits',
    title: 'Audits',
    body: (
      <>
        <p>
          Processor makes available to Controller the information necessary to
          demonstrate compliance with this Addendum, including the controls
          inventory at <Link href="/security/controls" style={{ color: 'var(--brand)' }}>/security/controls</Link>,
          third-party penetration test summaries on request, and SOC-style reports
          as they become available.
        </p>
        <p>
          Controller may conduct an audit no more than once per twelve-month period
          with 30 days' notice, at Controller's cost, during business hours, and
          subject to confidentiality obligations.
        </p>
      </>
    ),
  },
];

export default function DpaPage() {
  return (
    <div className="min-h-screen px-5 md:px-8 py-20 md:py-28">
      <div className="max-w-3xl mx-auto">
        <p
          className="text-[10px] tracking-[0.16em] uppercase mb-3 font-light"
          style={{ color: 'var(--text-3)' }}
        >
          Legal · Data Processing Addendum
        </p>
        <h1 className="text-3xl md:text-4xl font-extralight tracking-tight mb-4">
          Data Processing Addendum
        </h1>
        <p className="text-sm font-light leading-relaxed mb-10" style={{ color: 'var(--text-2)' }}>
          This is the public, plain-English version of the DPA that forms part of
          GRID's Master Services Agreement. The signed contract mirrors this
          language; the controls referenced throughout are verifiable at{' '}
          <Link href="/security/controls" style={{ color: 'var(--brand)' }}>
            /security/controls
          </Link>
          .
        </p>

        <nav
          className="rounded-2xl p-5 mb-10"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <p
            className="text-[10px] tracking-[0.16em] uppercase mb-3 font-light"
            style={{ color: 'var(--text-3)' }}
          >
            Contents
          </p>
          <ol className="space-y-1.5">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm font-light"
                  style={{ color: 'var(--text-2)' }}
                >
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-12">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id}>
              <p
                className="text-[10px] tracking-[0.16em] uppercase mb-2 font-light"
                style={{ color: 'var(--text-3)' }}
              >
                Section {i + 1}
              </p>
              <h2
                className="text-xl font-light mb-4"
                style={{ color: 'var(--text-1)', letterSpacing: '-0.01em' }}
              >
                {s.title}
              </h2>
              <div
                className="text-sm font-light leading-relaxed space-y-3 dpa-prose"
                style={{ color: 'var(--text-2)' }}
              >
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <div
          className="rounded-2xl p-6 mt-14"
          style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
        >
          <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Need the countersigned DPA for your procurement file? Email{' '}
            <a href="mailto:legal@grid.app" style={{ color: 'var(--brand)' }}>
              legal@grid.app
            </a>{' '}
            with your company name. We'll return a PDF within one business day.
          </p>
        </div>
      </div>
      <style>{`
        .dpa-prose p { margin-bottom: 0.75rem; }
        .dpa-prose ul { list-style: disc; padding-left: 1.25rem; margin: 0.75rem 0; }
        .dpa-prose li { margin-bottom: 0.3rem; }
        .dpa-prose code {
          font-size: 0.8em;
          background: rgba(255,255,255,0.04);
          padding: 1px 5px;
          border-radius: 4px;
        }
        .dpa-prose strong { color: var(--text-1); font-weight: 400; }
      `}</style>
      <LegalFooter />
    </div>
  );
}
