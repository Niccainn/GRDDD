import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get('grid_session');

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/access');
  }
}
