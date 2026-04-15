/**
 * /terms — Terms of Service
 *
 * TEMPLATE Terms of Service for GRID. Plain-language where possible,
 * legal-language where necessary. Covers:
 *   - Account eligibility (18+)
 *   - Acceptable use
 *   - AI output disclaimer and ownership
 *   - Payment (placeholder until billing ships)
 *   - Warranties and liability cap
 *   - Termination
 *   - Governing law
 *
 * Should be reviewed by counsel before public launch.
 */
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service · GRID',
  description: 'The terms you agree to by using GRID.',
};

const LAST_UPDATED = 'April 9, 2026';

export default function TermsPage() {
  return (
    <div className="min-h-screen ambient-bg px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-xs font-light mb-8 inline-block"
          style={{ color: 'var(--text-3)' }}
        >
          ← GRID
        </Link>

        <h1 className="text-3xl font-light mb-2" style={{ color: 'var(--text-1)' }}>
          Terms of Service
        </h1>
        <p className="text-xs font-light mb-12" style={{ color: 'var(--text-3)' }}>
          Last updated: {LAST_UPDATED}
        </p>

        <div
          className="space-y-8 text-sm font-light leading-relaxed"
          style={{ color: 'var(--text-2)' }}
        >
          <Section title="1. Agreement">
            By creating an account or using GRID (the &ldquo;Service&rdquo;), you agree to these
            Terms and to our{' '}
            <Link href="/privacy" style={{ color: 'var(--brand)' }}>Privacy Policy</Link>. If you
            do not agree, do not use the Service.
          </Section>

          <Section title="2. Eligibility">
            You must be at least 18 years old and legally able to enter into a contract. If you
            use GRID on behalf of an organization, you represent that you are authorized to bind
            that organization to these Terms.
          </Section>

          <Section title="3. Your account">
            You are responsible for your account credentials and for all activity under your
            account. You will promptly notify us at{' '}
            <a href="mailto:security@grid.app" style={{ color: 'var(--brand)' }}>
              security@grid.app
            </a>{' '}
            if you suspect unauthorized access.
          </Section>

          <Section title="4. Acceptable use">
            You agree NOT to:
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Use the Service for any illegal purpose.</li>
              <li>Generate content that is harmful, defamatory, or infringing.</li>
              <li>
                Attempt to bypass security, rate limits, or authentication. Brute-force testing
                and automated credential stuffing are expressly prohibited.
              </li>
              <li>
                Use the Service to build a competing product by scraping outputs or training
                derivative models.
              </li>
              <li>
                Submit prompts designed to cause Nova to produce content that violates
                Anthropic&rsquo;s{' '}
                <a
                  href="https://www.anthropic.com/legal/aup"
                  style={{ color: 'var(--brand)' }}
                  target="_blank"
                  rel="noreferrer"
                >
                  Acceptable Use Policy
                </a>
                .
              </li>
              <li>
                Upload personal data about third parties without the lawful basis to do so.
              </li>
            </ul>
          </Section>

          <Section title="5. AI outputs">
            Nova is an AI system powered by Anthropic&rsquo;s Claude models. Outputs can be
            inaccurate, incomplete, or biased. You retain all ownership rights to your inputs and
            to the outputs generated for you, subject to the rights of any underlying models.
            <br />
            <br />
            <b>You must not rely on Nova outputs for medical, legal, tax, or financial advice.</b>{' '}
            You are responsible for reviewing outputs before acting on them, and you agree that
            GRID is not liable for decisions made on the basis of Nova outputs.
          </Section>

          <Section title="6. Your content">
            You retain ownership of content you upload, create, or submit. You grant GRID a
            non-exclusive, worldwide, royalty-free license to host, process, and display your
            content solely as needed to operate the Service on your behalf.
          </Section>

          <Section title="7. Fees">
            GRID is currently in limited availability. Paid plans and billing terms will be
            published before any charge is made to you. You will always receive at least 30
            days&rsquo; notice of any price change or introduction of fees.
          </Section>

          <Section title="8. Disclaimers">
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
            WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL
            IMPLIED WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR
            ERROR-FREE, OR THAT NOVA OUTPUTS WILL BE ACCURATE.
          </Section>

          <Section title="9. Limitation of liability">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, GRID&rsquo;S AGGREGATE LIABILITY ARISING OUT
            OF OR RELATED TO THESE TERMS OR THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE
            AMOUNT YOU PAID GRID IN THE TWELVE MONTHS BEFORE THE CLAIM AROSE OR (B) ONE HUNDRED
            U.S. DOLLARS. IN NO EVENT WILL GRID BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR
            CONSEQUENTIAL DAMAGES.
          </Section>

          <Section title="10. Termination">
            You may delete your account at any time. We may suspend or terminate accounts that
            violate these Terms, with or without notice. On termination, your right to use the
            Service ends immediately and your data is handled per the{' '}
            <Link href="/privacy" style={{ color: 'var(--brand)' }}>Privacy Policy</Link>.
          </Section>

          <Section title="11. Changes">
            We may update these Terms from time to time. Material changes will be announced at
            least 14 days before they take effect. Continued use of the Service after the
            effective date constitutes acceptance.
          </Section>

          <Section title="12. Governing law">
            These Terms are governed by the laws of the State of Delaware, United States, without
            regard to its conflict of laws rules. Disputes will be resolved in the state or
            federal courts located in Delaware, except where applicable consumer protection law
            gives you the right to bring a claim in your home jurisdiction.
          </Section>

          <Section title="13. Contact">
            <a href="mailto:legal@grid.app" style={{ color: 'var(--brand)' }}>
              legal@grid.app
            </a>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="text-base font-light mb-3"
        style={{ color: 'var(--text-1)' }}
      >
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
