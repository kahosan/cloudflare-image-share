import { Login } from '@/app/components/login';
import { checkAuth } from '@/app/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const runtime = 'edge';

export default async function LoginPage() {
  const c = await cookies();
  const isAuth = await checkAuth(c.get('token')?.value);
  if (isAuth)
    redirect('/');

  return <Login />;
}
