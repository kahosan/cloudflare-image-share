import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/app/lib/auth';
import { getStorageProvider } from '@/app/provider/storage-provider';
import type { FileListResult } from '@/app/provider/storage-provider';
import { FileManager } from '@/app/components/manager/file-manager';

function Notice({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-16 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

async function loadFiles(): Promise<{ result: FileListResult } | { error: string } | { unsupported: true }> {
  try {
    const provider = getStorageProvider();
    if (!provider.list)
      return { unsupported: true };

    return { result: await provider.list() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '读取文件列表失败' };
  }
}

function Body({ data }: { data: Awaited<ReturnType<typeof loadFiles>> }) {
  if ('result' in data)
    return <FileManager initialItems={data.result.items} truncated={data.result.truncated} />;

  if ('unsupported' in data) {
    return (
      <Notice title="当前存储后端不支持文件管理">
        文件管理仅支持 Cloudflare R2，请将 STORAGE_PROVIDER 设置为 r2。
      </Notice>
    );
  }

  return <Notice title="无法读取文件列表">{data.error}</Notice>;
}

export default async function Manager() {
  // 之前这里没有任何鉴权，未登录用户也能直接列出所有文件
  if (!await isAuthenticated())
    redirect('/login');

  const data = await loadFiles();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-24">
      <h1 className="mb-6 text-2xl font-semibold">文件管理</h1>
      <Body data={data} />
    </div>
  );
}
