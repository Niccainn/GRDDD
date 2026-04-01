import { prisma } from '@/lib/db';

export async function GET() {
  const environments = await prisma.environment.findMany({
    select: { id: true, name: true, slug: true, color: true },
    orderBy: { name: 'asc' },
  });
  return Response.json(environments);
}
