import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/app/lib/auth';
import { getConfig } from '@/app/lib/config';
import { IMAGE_TYPES, IMAGE_TYPES_HINT, sniffImageType } from '@/app/lib/image-types';
import { getStorageProvider } from '@/app/provider/storage-provider';

// multipart 的边界和字段头等额外开销，用于在解析 body 之前按 Content-Length 快速拒绝超大请求
const MULTIPART_OVERHEAD = 64 * 1024;

function fail(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: NextRequest) {
  if (!await isAuthenticated())
    return fail('Unauthorized', 401);

  const { maxImageSize } = getConfig();
  const maxBytes = maxImageSize * 1024 * 1024;
  const tooLarge = () => fail(`文件大小超过限制（最大 ${maxImageSize} MB）`, 413);

  const contentLength = Number(request.headers.get('content-length'));
  if (contentLength > maxBytes + MULTIPART_OVERHEAD)
    return tooLarge();

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File) || file.size === 0)
    return fail('未收到文件', 400);

  if (file.size > maxBytes)
    return tooLarge();

  // 不信任客户端声明的文件名 / MIME，只认文件头魔数，并由此决定扩展名和 Content-Type
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const contentType = sniffImageType(head);
  if (!contentType)
    return fail(`不支持的文件类型，仅支持 ${IMAGE_TYPES_HINT}`, 415);

  try {
    const key = await getStorageProvider().save(file, {
      filename: file.name,
      extension: IMAGE_TYPES[contentType].extension,
      contentType
    });
    return NextResponse.json({ key: key.path });
  } catch (e) {
    return fail(e instanceof Error ? e.message : '上传失败', 500);
  }
}
