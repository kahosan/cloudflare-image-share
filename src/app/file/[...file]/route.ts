import type { NextRequest } from 'next/server';
import { getStorageProvider } from '@/app/provider/storage-provider';
import { getFileExtension } from '@/app/lib/utils';
import { mimeFromExtension } from '@/app/lib/image-types';

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

export async function GET(request: NextRequest, { params }: { params: Promise<{ file: string[] }> }) {
  const path = (await params).file.join('/');

  let loaded;
  try {
    loaded = await getStorageProvider().load({ path }, request.headers);
  } catch (e) {
    return new Response(e instanceof Error ? e.message : 'Internal error', { status: 500 });
  }
  if (!loaded)
    return new Response('File not found', { status: 404 });

  // 只按白名单扩展名返回图片类型；其他（比如历史上传的 .html / .svg）一律当作下载附件，永远不会在站点域名下被渲染执行
  const contentType = mimeFromExtension(getFileExtension(path));

  const headers = new Headers({
    'Content-Type': contentType ?? 'application/octet-stream',
    'Cache-Control': CACHE_CONTROL,
    ETag: loaded.etag,
    'Last-Modified': loaded.uploaded.toUTCString(),
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    // 即使被直接打开，也禁止执行任何脚本 / 加载任何子资源
    'Content-Security-Policy': 'default-src \'none\'; style-src \'unsafe-inline\'; sandbox'
  });
  if (!contentType)
    headers.set('Content-Disposition', 'attachment');

  if (!loaded.body)
    return new Response(null, { status: 304, headers });

  if (loaded.range) {
    const { offset, length } = loaded.range;
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${loaded.size}`);
    headers.set('Content-Length', String(length));
    return new Response(loaded.body, { status: 206, headers });
  }

  headers.set('Content-Length', String(loaded.size));
  return new Response(loaded.body, { headers });
}
