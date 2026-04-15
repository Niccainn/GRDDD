import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { saveFile, StorageError } from '@/lib/storage';

function detectCategory(mimeType: string): string {
  if (mimeType.startsWith('image/svg')) return 'icon';
  if (mimeType.startsWith('image/')) return 'photo';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('word') ||
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown'
  ) {
    return 'document';
  }
  return 'other';
}

export async function GET(request: Request) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const envId = searchParams.get('envId');
  const category = searchParams.get('category');
  const tags = searchParams.get('tags');
  const q = searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    identityId: identity.id,
    parentId: null, // exclude version children
  };

  if (envId) where.environmentId = envId;
  if (category && category !== 'all') where.category = category;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
      { tags: { contains: q } },
      { filename: { contains: q } },
    ];
  }

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        _count: { select: { versions: true } },
        environment: { select: { id: true, name: true } },
        identity: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.asset.count({ where }),
  ]);

  // Filter by tags client-side if needed (JSON string search is limited in SQLite)
  let filtered = assets;
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase());
    filtered = assets.filter(a => {
      try {
        const assetTags: string[] = JSON.parse(a.tags);
        return tagList.some(t => assetTags.map(at => at.toLowerCase()).includes(t));
      } catch {
        return false;
      }
    });
  }

  return Response.json({
    assets: filtered,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const environmentId = formData.get('environmentId') as string;
    if (!environmentId) {
      return Response.json({ error: 'Environment ID required' }, { status: 400 });
    }

    // Verify environment ownership
    const env = await prisma.environment.findFirst({
      where: { id: environmentId, ownerId: identity.id, deletedAt: null },
    });
    if (!env) {
      return Response.json({ error: 'Environment not found' }, { status: 404 });
    }

    const saved = await saveFile(file, identity.id);

    const name = (formData.get('name') as string) || file.name.replace(/\.[^.]+$/, '');
    const description = (formData.get('description') as string) || '';
    const category = (formData.get('category') as string) || detectCategory(file.type);
    const tagsRaw = (formData.get('tags') as string) || '';
    const tags = tagsRaw
      ? JSON.stringify(tagsRaw.split(',').map(t => t.trim()).filter(Boolean))
      : '[]';

    // For version uploads
    const parentId = (formData.get('parentId') as string) || null;
    let version = 1;
    if (parentId) {
      const parent = await prisma.asset.findUnique({ where: { id: parentId } });
      if (!parent) {
        return Response.json({ error: 'Parent asset not found' }, { status: 404 });
      }
      // Get highest version number among siblings
      const maxVersion = await prisma.asset.findFirst({
        where: { OR: [{ id: parentId }, { parentId }] },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      version = (maxVersion?.version ?? 1) + 1;
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        description,
        filename: saved.filename,
        mimeType: saved.mimeType,
        size: saved.size,
        path: saved.path,
        tags,
        category,
        version,
        parentId,
        environmentId,
        identityId: identity.id,
      },
    });

    return Response.json(asset, { status: 201 });
  } catch (err) {
    if (err instanceof StorageError) {
      return Response.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Upload failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
