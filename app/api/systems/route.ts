import { prisma } from '@/lib/db';

export async function GET() {
  const systems = await prisma.system.findMany({
    select: { id: true, name: true, environmentId: true, color: true },
    orderBy: { name: 'asc' },
  });
  return Response.json(systems);
}
