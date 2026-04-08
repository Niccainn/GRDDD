import { NextRequest } from 'next/server';
import { getAuthIdentity } from '@/lib/auth';
import { eraseUserData } from '@/lib/gdpr';

export async function DELETE(req: NextRequest) {
  const identity = await getAuthIdentity();
  const { confirmation } = await req.json();

  if (confirmation !== 'DELETE MY DATA') {
    return Response.json(
      { error: 'Please confirm by sending { "confirmation": "DELETE MY DATA" }' },
      { status: 400 }
    );
  }

  await eraseUserData(identity.id);
  return Response.json({ success: true, message: 'Your data has been erased' });
}
