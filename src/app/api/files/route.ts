import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/app/lib/auth';
import { getStorageProvider } from '@/app/provider/storage-provider';

export const runtime = 'edge';

const MAX_PATHS_PER_REQUEST = 1000;

function parsePaths(body: unknown): string[] | null {
  if (typeof body !== 'object' || body === null || !('paths' in body))
    return null;

  const { paths } = body;
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > MAX_PATHS_PER_REQUEST)
    return null;

  if (!paths.every((p): p is string => typeof p === 'string' && p.length > 0 && p.length <= 1024))
    return null;

  return [...new Set(paths)];
}

/** 批量删除文件：DELETE /api/files  body: { paths: string[] } */
export async function DELETE(request: NextRequest) {
  if (!await isAuthenticated())
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const paths = parsePaths(await request.json().catch(() => null));
  if (!paths)
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });

  try {
    const provider = getStorageProvider();
    if (!provider.remove)
      return NextResponse.json({ message: 'Current storage provider does not support deleting files' }, { status: 501 });

    await provider.remove(paths);
    return NextResponse.json({ deleted: paths.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete files';
    return NextResponse.json({ message }, { status: 500 });
  }
}
