import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response('OK', { status: 200 });
  } catch {
    return new Response('NOT READY', { status: 503 });
  }
}
