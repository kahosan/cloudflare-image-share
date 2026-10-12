import type { FileItem, FileKey, FileListResult, LoadedFile, SaveMeta, StorageProvider } from '@/app/provider/storage-provider';
import { generateRandomString } from '@/app/lib/utils';

/** 把 R2 返回的各种 range 形态统一成 { offset, length } */
function resolveRange(range: R2Range, size: number): { offset: number, length: number } {
  if ('suffix' in range) {
    const length = Math.min(range.suffix, size);
    return { offset: size - length, length };
  }
  const offset = range.offset ?? 0;
  return { offset, length: Math.min(range.length ?? size - offset, size - offset) };
}

/**
 * 把请求头里的条件请求解析成 R2 的 onlyIf。
 * 不直接把 Headers 对象传给 R2：不同运行环境（next dev 的代理、next-on-pages）下的 Headers 并不一定是 R2 binding 能序列化的原生对象。
 */
function parseConditional(headers: Headers): R2Conditional | undefined {
  const ifNoneMatch = headers.get('If-None-Match');
  if (ifNoneMatch && ifNoneMatch.trim() !== '*') {
    // 浏览器通常只发一个 etag；去掉弱校验前缀 W/ 和引号后与 R2 的 etag 比较
    const etag = ifNoneMatch.split(',')[0].trim().replace(/^W\//, '').replaceAll('"', '');
    return { etagDoesNotMatch: etag };
  }

  // 按 HTTP 规范，If-None-Match 存在时忽略 If-Modified-Since
  const ifModifiedSince = headers.get('If-Modified-Since');
  if (!ifNoneMatch && ifModifiedSince) {
    const date = new Date(ifModifiedSince);
    if (!Number.isNaN(date.getTime()))
      return { uploadedAfter: date, secondsGranularity: true };
  }
}

/** 解析单区间 Range：bytes=0-99 / bytes=100- / bytes=-500；多区间或格式非法时忽略，返回完整内容 */
function parseRange(headers: Headers): R2Range | undefined {
  const m = /^bytes=(\d*)-(\d*)$/.exec(headers.get('Range')?.trim() ?? '');
  if (!m || (m[1] === '' && m[2] === ''))
    return;

  if (m[1] === '')
    return { suffix: Number(m[2]) };

  const offset = Number(m[1]);
  if (m[2] === '')
    return { offset };

  const end = Number(m[2]);
  return end >= offset ? { offset, length: end - offset + 1 } : undefined;
}

export default class R2StorageProvider implements StorageProvider {
  constructor(private bucket: R2Bucket) {}

  async list(limit = 5000): Promise<FileListResult> {
    // R2 单次 list 最多返回 1000 条，这里循环翻页直到取完或达到上限
    const items: FileItem[] = [];
    let cursor: string | undefined;
    do {
      // eslint-disable-next-line no-await-in-loop -- 必须拿到上一页的 cursor 才能翻页
      const page = await this.bucket.list({ cursor });
      for (const obj of page.objects)
        items.push({ path: obj.key, size: obj.size, uploaded: obj.uploaded.toISOString() });

      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor && items.length < limit);

    return { items, truncated: cursor !== undefined };
  }

  async remove(paths: string[]): Promise<void> {
    // R2 的 delete 单次最多接受 1000 个 key
    for (let i = 0; i < paths.length; i += 1000) {
      // eslint-disable-next-line no-await-in-loop -- 分批串行，避免一次性打满子请求
      await this.bucket.delete(paths.slice(i, i + 1000));
    }
  }

  async load(key: FileKey, headers?: Headers): Promise<LoadedFile | null> {
    const onlyIf = headers && parseConditional(headers);
    const range = headers && parseRange(headers);

    let obj;
    let ranged = range !== undefined;
    try {
      obj = await this.bucket.get(key.path, { onlyIf, range });
    } catch (e) {
      if (!range)
        throw e;

      // Range 起点超出文件大小等无法满足的情况：忽略 Range，返回完整文件（HTTP 允许）
      ranged = false;
      obj = await this.bucket.get(key.path, { onlyIf });
    }
    if (!obj)
      return null;

    return {
      // 条件请求命中时 R2 返回的对象不带 body
      body: 'body' in obj ? obj.body : null,
      size: obj.size,
      etag: obj.httpEtag,
      uploaded: obj.uploaded,
      // 只有请求里带了合法 Range 才算部分内容；有的 R2 实现即使没请求 Range 也会返回完整区间
      range: ranged && obj.range ? resolveRange(obj.range, obj.size) : undefined
    };
  }

  async save(file: ReadableStream | Blob, meta: SaveMeta): Promise<FileKey> {
    const key = `${generateRandomString(12)}.${meta.extension}`;
    await this.bucket.put(key, file, {
      httpMetadata: { contentType: meta.contentType },
      customMetadata: { filename: meta.filename }
    });
    return { path: key };
  }
}
