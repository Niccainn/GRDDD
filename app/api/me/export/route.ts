import { getAuthIdentity } from '@/lib/auth';
import { exportUserData } from '@/lib/gdpr';

export async function GET() {
  const identity = await getAuthIdentity();
  const data = await exportUserData(identity.id);

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="grid-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
