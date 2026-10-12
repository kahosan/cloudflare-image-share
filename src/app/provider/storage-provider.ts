import { getRequestContext } from '@cloudflare/next-on-pages';
import R2StorageProvider from '@/app/provider/r2-storage-provider';

export interface FileKey {
  path: string
}

export interface FileItem {
  path: string
  /** 字节数 */
  size: number
  /** ISO 8601 时间字符串（可直接序列化给客户端组件） */
  uploaded: string
}

export interface FileListResult {
  items: FileItem[]
  /** 达到 limit 上限，仍有文件未列出 */
  truncated: boolean
}

export interface SaveMeta {
  /** 用户原始文件名，仅作为元数据保存 */
  filename: string
  /** 已校验过的扩展名（不含点），决定存储 key 的后缀 */
  extension: string
  /** 已校验过的 MIME 类型 */
  contentType: string
}

export interface LoadedFile {
  /** 为 null 表示条件请求命中（应响应 304） */
  body: ReadableStream | null
  /** 文件完整大小 */
  size: number
  etag: string
  uploaded: Date
  /** 仅 Range 请求时有值：实际返回的字节区间 */
  range?: { offset: number, length: number }
}

export interface StorageProvider {
  save(file: ReadableStream | Blob, meta: SaveMeta): Promise<FileKey>
  /** headers 为原始请求头，用于 If-None-Match / Range 等条件请求 */
  load(key: FileKey, headers?: Headers): Promise<LoadedFile | null>
  /** 可选能力：列出文件 */
  list?(limit?: number): Promise<FileListResult>
  /** 可选能力：批量删除 */
  remove?(paths: string[]): Promise<void>
}

export function getStorageProvider(): StorageProvider {
  const env = getRequestContext().env;
  const providerCfg = env.STORAGE_PROVIDER || 'r2';
  if (providerCfg === 'telegraph')
    throw new Error('telegraph 已停止服务且相关代码已移除，请将 STORAGE_PROVIDER 改为 r2 并绑定 R2_BUCKET');

  if (providerCfg !== 'r2')
    throw new Error(`不支持的存储后端：${providerCfg}`);

  if (!env.R2_BUCKET)
    throw new Error('未绑定 R2_BUCKET，请在 Cloudflare Pages「设置 → 函数 → R2 存储桶绑定」中添加');

  return new R2StorageProvider(env.R2_BUCKET);
}
