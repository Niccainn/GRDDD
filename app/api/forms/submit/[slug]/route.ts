import { prisma } from '@/lib/db';
import { parseFields, parseSettings, validateSubmission } from '@/lib/forms';
import { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const form = await prisma.form.findUnique({
    where: { slug },
  });

  if (!form || !form.isPublished) {
    return Response.json({ error: 'Form not found' }, { status: 404 });
  }

  const settings = parseSettings(form.settings);

  return Response.json({
    name: form.name,
    description: form.description,
    fields: parseFields(form.fields),
    settings: {
      submitLabel: settings.submitLabel,
      successMessage: settings.successMessage,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const form = await prisma.form.findUnique({
    where: { slug },
  });

  if (!form || !form.isPublished) {
    return Response.json({ error: 'Form not found' }, { status: 404 });
  }

  const body = await req.json();
  const data = body.data ?? {};
  const fields = parseFields(form.fields);
  const settings = parseSettings(form.settings);

  // Validate required fields
  const errors = validateSubmission(fields, data);
  if (errors.length > 0) {
    return Response.json({ error: 'Validation failed', errors }, { status: 400 });
  }

  // Collect metadata
  const metadata: Record<string, string> = {};
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) metadata.ip = forwarded.split(',')[0].trim();
  const ua = req.headers.get('user-agent');
  if (ua) metadata.userAgent = ua;
  const referer = req.headers.get('referer');
  if (referer) metadata.referrer = referer;

  await prisma.formSubmission.create({
    data: {
      formId: form.id,
      data: JSON.stringify(data),
      metadata: JSON.stringify(metadata),
    },
  });

  return Response.json({
    ok: true,
    message: settings.successMessage || 'Thank you for your submission.',
    redirectUrl: settings.redirectUrl || null,
  });
}
