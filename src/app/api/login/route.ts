import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { login, TOKEN_MAX_AGE_SECONDS } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const body = await request.json<{ password?: unknown } | null>().catch(() => null);
  if (typeof body?.password !== 'string')
    return NextResponse.json({ pass: false, message: '请求格式错误' }, { status: 400 });

  const token = await login(body.password);
  if (!token)
    return NextResponse.json({ pass: false, message: '密码错误' }, { status: 401 });

  const cookieStore = await cookies();
  cookieStore.set('token', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: TOKEN_MAX_AGE_SECONDS
  });

  return NextResponse.json({ pass: true });
}
