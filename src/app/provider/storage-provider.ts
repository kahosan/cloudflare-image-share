import { getRequestContext } from '@cloudflare/next-on-pages';
import R2StorageProvider from '@/app/provider/r2-storage-provider';
import TelegraphStorageProvider from '@/app/provider/telegraph-storage-provider';
import SignProxyProvider from '@/app/provider/sign-proxy-provider';

export type StorageProviderType = 'r2' | 'telegraph';
export interface FileKey {
  path: string
  query?: URLSearchParams
}
export interface StorageProvider {
  save(file: ReadableStream | Blob, filename: string): Promise<FileKey>
  load(key: FileKey): Promise<ReadableStream | Blob | null>
  getKeys?(): Promise<FileKey[]>
}

export function getStorageProvider(): StorageProvider {
  const providerCfg = getRequestContext().env.STORAGE_PROVIDER || 'r2';
  if (providerCfg === 'r2') {
    const bucket = getRequestContext().env.R2_BUCKET;
    if (!bucket)
      throw new Error('R2_BUCKET binding is required');

    return new R2StorageProvider(bucket);
  }

  if (providerCfg === 'telegraph') {
    const enableSign = getRequestContext().env.TELEGRAPH_SIGN_ENABLED === 'true';
    if (enableSign) {
      const secret = getRequestContext().env.SECRET_KEY;
      if (!secret)
        throw new Error('ENV SECRET_KEY is required');

      return new SignProxyProvider(secret, new TelegraphStorageProvider());
    }
    return new TelegraphStorageProvider();
  }
  throw new Error(`Unknown storage provider: ${providerCfg}`);
}
