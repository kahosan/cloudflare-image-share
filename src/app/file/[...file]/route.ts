import type { NextRequest } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getStorageProvider, StorageProvider } from '@/app/provider/storage-provider';
import R2StorageProvider from '@/app/provider/r2-storage-provider';
import { NextApiRequest } from 'next';
import mime from 'mime';
import TelegraphStorageProvider from '@/app/provider/telegraph-storage-provider';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileParams = searchParams.getAll('file');
  const file = (fileParams).join('/');

  const provider = getStorageProvider();
  const result = await provider.load({ path: file, query: searchParams });

  if (!result)
    return new Response('File not found', { status: 404 });

  const mimeType = mime.getType(file) || 'application/octet-stream';
  const expiresDate = new Date(Date.now() + 31_536_000 * 1000).toUTCString();

  return new Response(result, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      Expires: expiresDate
    }
  });
}
