'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import GoogleButton from '@/components/auth/GoogleButton';
import PasswordField from '@/components/auth/PasswordField';
import AuthLayout from '@/components/auth/AuthLayout';
import { trackEvent } from '@/lib/analytics';

// Client-side password strength hint. Intentionally low-friction:
// the server enforces the actual minimum (12 chars). This is cosmetic
// feedback only — we don't block submit on strength, only on length.
function scorePassword(pw: string): { label: string; tone: string; pct: number } {
  if (!pw) return { label: '', tone: 'var(--text-3)', pct: 0 };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const map = [
    { label: 'Too short', tone: 'var(--danger)', pct: 15 },
    { label: 'Weak', tone: 'var(--danger)', pct: 30 },
    { label: 'Fair', tone: '#F7C700', pct: 55 },
    { label: 'Good', tone: '#7193ED', pct: 75 },
    { label: 'Strong', tone: 'var(--brand)', pct: 95 },
    { label: 'Strong', tone: 'var(--brand)', pct: 100 },
  ];
  return map[score];
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthLayout title="Get started with GRID" subtitle="See how your business actually works"><div className="h-64" /></AuthLayout>}>
      <SignUpInner />
    </Suspense>
  );
}

function SignUpInner() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // GDPR Art. 7 — the ToS/Privacy checkbox is required; marketing is
  // strictly optional (default off) and has its own audit row.
  const [consentTosPrivacy, setConsentTosPrivacy] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const oauthError = searchParams.get('error');
  const next = searchParams.get('next') || '/welcome';
  const strength = scorePassword(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, consentTosPrivacy, consentMarketing }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign up failed');
        setLoading(false);
        return;
      }
      trackEvent('funnel.sign_up_completed');
      refresh();
      router.push(next);
    } catch {
      setError('Connection error');
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Get started with GRID"
      subtitle="See how your business actually works"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/sign-in" className="transition-colors" style={{ color: 'var(--text-2)' }}>
            Sign in
          </Link>
        </>
      }
    >
      {/* Value preview — what you're signing up for */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {[
          { label: '110+ Integrations', color: '#7193ED' },
          { label: 'AI Workflows', color: '#BF9FF1' },
          { label: 'Operational Intelligence', color: '#15AD70' },
        ].map(pill => (
          <span
            key={pill.label}
            className="text-[10px] font-light px-3 py-1.5 rounded-full tracking-wide"
            style={{
              background: `${pill.color}10`,
              border: `1px solid ${pill.color}25`,
              color: pill.color,
            }}
          >
            {pill.label}
          </span>
        ))}
      </div>

      <GoogleButton label="Sign up with Google" next={next} />

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span className="text-[10px] uppercase tracking-[0.14em] font-light" style={{ color: 'var(--text-3)' }}>
          or
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="glass-input w-full px-4 py-3 text-sm"
            placeholder="Your name"
            autoComplete="name"
            required
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
            Work email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="glass-input w-full px-4 py-3 text-sm"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs mb-2 font-light" style={{ color: 'var(--text-3)' }}>
            Password
          </label>
          <PasswordField
            value={password}
            onChange={setPassword}
            placeholder="Min 12 characters"
            autoComplete="new-password"
            minLength={12}
          />
          {password && (
            <div className="mt-2">
              <div className="h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${strength.pct}%`, background: strength.tone }}
                />
              </div>
              <p className="text-[10px] font-light mt-1 tracking-wide" style={{ color: strength.tone }}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        {(error || oauthError) && (
          <p className="text-xs px-3 py-2.5 rounded-lg font-light" style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}>
            {error || decodeURIComponent(oauthError || '')}
          </p>
        )}

        {/* GDPR Art. 7 consent — required for ToS/Privacy, optional
            for marketing. "By continuing you agree…" is not enough
            under EU law; the user must take a deliberate affirmative
            action. We log each checkbox state independently to
            ConsentLog so the audit trail is provable. */}
        <div className="space-y-2 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consentTosPrivacy}
              onChange={e => setConsentTosPrivacy(e.target.checked)}
              required
              className="mt-0.5 w-3.5 h-3.5 rounded flex-shrink-0"
              style={{ accentColor: 'var(--brand)' }}
              aria-describedby="tos-consent-label"
            />
            <span id="tos-consent-label" className="text-[11px] font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>
              I agree to the{' '}
              <Link href="/terms" className="underline" style={{ color: 'var(--text-1)' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="underline" style={{ color: 'var(--text-1)' }}>Privacy Policy</Link>.
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consentMarketing}
              onChange={e => setConsentMarketing(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 rounded flex-shrink-0"
              style={{ accentColor: 'var(--brand)' }}
              aria-describedby="marketing-consent-label"
            />
            <span id="marketing-consent-label" className="text-[11px] font-light leading-relaxed" style={{ color: 'var(--text-3)' }}>
              Email me about product updates (optional — you can unsubscribe anytime).
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !consentTosPrivacy}
          className="w-full py-[13px] text-sm font-light rounded-full transition-all"
          style={{
            background: 'var(--brand)',
            color: '#000',
            fontWeight: 400,
            opacity: loading || !consentTosPrivacy ? 0.5 : 1,
          }}
        >
          {loading ? 'Creating workspace\u2026' : 'Create workspace'}
        </button>

        <p className="text-[10px] text-center font-light pt-1" style={{ color: 'var(--text-3)' }}>
          See our{' '}
          <Link href="/subprocessors" style={{ color: 'var(--text-2)' }}>subprocessors</Link>
          {' '}and{' '}
          <Link href="/security" style={{ color: 'var(--text-2)' }}>security policy</Link>.
        </p>
      </form>
    </AuthLayout>
  );
}
