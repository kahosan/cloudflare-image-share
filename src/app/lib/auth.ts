import { getCloudflareContext } from '@opennextjs/cloudflare';
import { cookies } from 'next/headers';
import * as jose from 'jose';

const encoder = new TextEncoder();
const ALG = 'HS256';
export const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * JWT 签名密钥。
 * - 推荐配置独立的 AUTH_SECRET：此时 token 里没有任何可用于离线爆破密码的信息；
 * - 未配置时回退为由 PASSWORD 派生的密钥（兼容旧部署），此时弱密码仍可能被离线爆破。
 */
async function getSigningKey(): Promise<Uint8Array> {
  const env = getCloudflareContext().env;
  if (env.AUTH_SECRET)
    return encoder.encode(env.AUTH_SECRET);

  const key = await crypto.subtle.importKey('raw', encoder.encode(env.PASSWORD ?? ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode('cloudflare-image-share:jwt')));
}

/** 常量时间比较：先各自取 SHA-256 再逐字节比较，避免长度和内容泄露时间差 */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = (await Promise.all([a, b].map(s => crypto.subtle.digest('SHA-256', encoder.encode(s))))).map(d => new Uint8Array(d));
  let diff = 0;
  for (const [i, byte] of x.entries())
    diff |= byte ^ y[i];

  return diff === 0;
}

/** 密码正确则返回 token，否则返回 null */
export async function login(password: unknown): Promise<string | null> {
  const expected = getCloudflareContext().env.PASSWORD;
  if (!expected || typeof password !== 'string')
    return null;

  if (!await safeEqual(password, expected))
    return null;

  return new jose.SignJWT({ pass: true })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE_SECONDS}s`)
    .sign(await getSigningKey());
}

export async function checkToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jose.jwtVerify(token, await getSigningKey(), { algorithms: [ALG] });
    return payload.pass === true;
  } catch {
    // token 过期 / 被篡改 / 密钥已更换时 jwtVerify 会抛错，视为未登录而不是 500
    return false;
  }
}

export async function checkAuth(token: string | undefined) {
  if (!getCloudflareContext().env.PASSWORD)
    return true; // 未设置密码：公开模式

  if (!token)
    return false;

  return checkToken(token);
}

/** 在 Server Component / Route Handler 中直接判断当前请求是否已登录 */
export async function isAuthenticated() {
  const c = await cookies();
  return checkAuth(c.get('token')?.value);
}
