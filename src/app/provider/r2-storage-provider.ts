import type { FileKey, StorageProvider } from '@/app/provider/storage-provider';
import { generateRandomString, getFileExtension } from '@/app/lib/utils';

export default class R2StorageProvider implements StorageProvider {
  constructor(private bucket: R2Bucket) {
    this.bucket = bucket;
  }

  async getKeys(): Promise<FileKey[]> {
    const keys = await this.bucket.list();
    return keys.objects.map(obj => ({ path: obj.key }));
  }

  async del(key: FileKey): Promise<void> {
    await this.bucket.delete(key.path);
  }

  async load(key: FileKey): Promise<ReadableStream | Blob | null> {
    const obj = await this.bucket.get(key.path);
    if (!obj)
      return null;

    return obj.body;
  }

  async save(file: ReadableStream | Blob, filename: string): Promise<FileKey> {
    const extension = getFileExtension(filename);
    const key = generateRandomString(12) + '.' + extension;
    const customMetadata = { 'x-amz-meta-filename': filename };
    await this.bucket.put(key, file, { customMetadata });
    return { path: key };
  }
}
