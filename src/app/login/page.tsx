import { Login } from '@/app/components/login';
import { isAuthenticated } from '@/app/lib/auth';
import { redirect } from 'next/navigation';

export const runtime = 'edge';

export default async function LoginPage() {
  if (await isAuthenticated())
    redirect('/');

  return <Login />;
}
