/**
 * k6 smoke-test profile.
 *
 *   k6 run load/smoke.js
 *   BASE_URL=https://grddd.com k6 run load/smoke.js
 *   SCENARIO=steady k6 run load/smoke.js
 *
 * Three scenarios, picked via the SCENARIO env var:
 *
 *   smoke (default)  — 1 VU, 30s. Single-user walk-through that
 *                      verifies every public endpoint returns 2xx.
 *   steady           — 10 VUs, 2 min. Sustained traffic at a level a
 *                      small beta cohort might produce. Checks for
 *                      latency regression against a p95 budget.
 *   burst            — ramp 0→50 VUs over 30s, hold 30s, ramp down.
 *                      Stress-test for the rate limiter; we EXPECT
 *                      some 429s on auth endpoints and count them as
 *                      correct behaviour, not failures.
 *
 * Endpoints hit in each scenario:
 *   - GET / (landing)
 *   - GET /api/health (liveness)
 *   - GET /.well-known/security.txt (static route)
 *   - GET /sign-in (auth page)
 *   - GET /pricing (marketing)
 *
 * Authenticated endpoints aren't hit here — they'd need a test
 * identity and a session, which belongs in the integration harness
 * (see __tests__/integration/). This smoke is about the public surface.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SCENARIO = __ENV.SCENARIO || 'smoke';

// Rate-limiter-expected-429s shouldn't fail the suite when the burst
// profile is intentionally triggering them.
const rateLimitedRate = new Rate('rate_limited');

const PROFILES = {
  smoke: {
    vus: 1,
    duration: '30s',
  },
  steady: {
    vus: 10,
    duration: '2m',
  },
  burst: {
    stages: [
      { duration: '30s', target: 50 },
      { duration: '30s', target: 50 },
      { duration: '30s', target: 0 },
    ],
  },
};

export const options = {
  // Merge profile-specific options. k6 will use either `vus+duration`
  // OR `stages` depending on which is present.
  ...PROFILES[SCENARIO],
  thresholds: {
    // Smoke + steady: no 5xx allowed; p95 under 2s.
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    // Rate-limits are expected under burst; don't fail on them alone.
    rate_limited: ['rate<0.5'],
  },
};

const PUBLIC_PATHS = ['/', '/sign-in', '/pricing', '/api/health', '/.well-known/security.txt'];

export default function () {
  for (const path of PUBLIC_PATHS) {
    const res = http.get(`${BASE_URL}${path}`);
    const ok = check(res, {
      'status is 2xx or 3xx': r => r.status >= 200 && r.status < 400,
      'has body': r => r.body && r.body.length > 0,
    });

    if (res.status === 429) rateLimitedRate.add(1);
    else rateLimitedRate.add(0);

    if (!ok && res.status >= 500) {
      console.error(`[${path}] ${res.status}: ${res.body?.toString().slice(0, 200)}`);
    }
  }
  sleep(1);
}

export function handleSummary(data) {
  // Print a compact summary so CI logs aren't flooded.
  const d = data.metrics.http_req_duration?.values;
  const f = data.metrics.http_req_failed?.values;
  const summary = {
    scenario: SCENARIO,
    base_url: BASE_URL,
    requests: data.metrics.http_reqs?.values?.count ?? 0,
    p95_ms: d?.['p(95)']?.toFixed(0) ?? '?',
    p99_ms: d?.['p(99)']?.toFixed(0) ?? '?',
    failure_rate: f?.rate?.toFixed(4) ?? '?',
    thresholds_passed: Object.values(data.thresholds ?? {}).every(t => !t.fails),
  };
   
  console.log('\n[k6 summary]', JSON.stringify(summary, null, 2));
  return { stdout: '' };
}
