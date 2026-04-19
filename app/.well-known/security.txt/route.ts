/**
 * /.well-known/security.txt — RFC 9116
 *
 * Served from a Next route handler (not a static file) so the Expires
 * timestamp updates on every deploy. Linked by the researcher-facing
 * /security page and by the Security Headers middleware. This is the
 * canonical contact for any automated disclosure scanner.
 */

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://grddd.com';
  const expires = new Date(Date.now() + 365 * 86_400_000).toISOString();

  const body = `Contact: mailto:security@grid.systems
Expires: ${expires}
Preferred-Languages: en
Canonical: ${origin}/.well-known/security.txt
Policy: ${origin}/security
Acknowledgments: ${origin}/changelog
Hiring: ${origin}/
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
