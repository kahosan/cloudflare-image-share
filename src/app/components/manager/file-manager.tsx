'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ImageIcon } from '@radix-ui/react-icons';
import { Button } from '@/app/components/ui/button';
import { useToast } from '@/app/components/ui/use-toast';
import { FileCard } from '@/app/components/manager/file-card';
import type { FileItem } from '@/app/provider/storage-provider';
import { formatBytes } from '@/app/lib/utils';

type SortKey = 'newest' | 'oldest' | 'largest';

const PAGE_SIZE = 48; // 每次渲染多少张，滚动到底部再继续追加
const DELETE_CHUNK = 500; // 单次请求最多删除多少个，需 ≤ 接口上限

const SORTERS: Record<SortKey, (a: FileItem, b: FileItem) => number> = {
  newest: (a, b) => b.uploaded.localeCompare(a.uploaded) || a.path.localeCompare(b.path),
  oldest: (a, b) => a.uploaded.localeCompare(b.uploaded) || a.path.localeCompare(b.path),
  largest: (a, b) => b.size - a.size || a.path.localeCompare(b.path)
};

class DeleteError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'DeleteError';
  }
}

async function requestDelete(paths: string[]): Promise<void> {
  const res = await fetch('/api/files', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths })
  });
  if (res.ok)
    return;

  const data = await res.json<{ message?: string }>().catch(() => null);
  throw new DeleteError(data?.message ?? `删除失败 (${res.status})`, res.status);
}

export interface FileManagerProps {
  initialItems: FileItem[]
  /** 文件数量超过后端单次可列出的上限 */
  truncated: boolean
}

export function FileManager({ initialItems, truncated }: FileManagerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [items, setItems] = useState(initialItems);
  const [sort, setSort] = useState<SortKey>('newest');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState<Set<string>>(() => new Set());
  const [confirmBatch, setConfirmBatch] = useState(false);

  const sorted = useMemo(() => [...items].sort(SORTERS[sort]), [items, sort]);
  const visible = useMemo(() => sorted.slice(0, limit), [sorted, limit]);
  const totalSize = useMemo(() => items.reduce((sum, i) => sum + i.size, 0), [items]);
  const hasMore = limit < sorted.length;

  // 滚动到底部自动加载更多
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore)
      return;

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting)
        setLimit(l => l + PAGE_SIZE);
    }, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, limit]);

  const toggleSelect = useCallback((path: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path))
        next.delete(path);
      else
        next.add(path);

      return next;
    });
  }, []);

  const removeFiles = useCallback(async (paths: string[]) => {
    if (paths.length === 0)
      return;

    setDeleting(prev => new Set([...prev, ...paths]));
    const deleted: string[] = [];
    let error: unknown;
    try {
      for (let i = 0; i < paths.length; i += DELETE_CHUNK) {
        const chunk = paths.slice(i, i + DELETE_CHUNK);
        // eslint-disable-next-line no-await-in-loop -- 分批串行删除，失败时能准确知道哪些已删除
        await requestDelete(chunk);
        deleted.push(...chunk);
      }
    } catch (e) {
      error = e;
    }

    // 即使中途失败，也要把已经成功删除的从界面上移除
    const gone = new Set(deleted);
    const settled = new Set(paths);
    setItems(prev => prev.filter(i => !gone.has(i.path)));
    setSelected(prev => new Set([...prev].filter(p => !gone.has(p))));
    setDeleting(prev => new Set([...prev].filter(p => !settled.has(p))));

    if (deleted.length > 0)
      toast({ description: `已删除 ${deleted.length} 个文件` });

    if (error) {
      if (error instanceof DeleteError && error.status === 401) {
        toast({ variant: 'destructive', title: '登录已过期，请重新登录' });
        router.push('/login');
        return;
      }
      toast({ variant: 'destructive', title: error instanceof Error ? error.message : '删除失败' });
    }
  }, [router, toast]);

  const handleBatchDelete = async () => {
    setConfirmBatch(false);
    await removeFiles([...selected]);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <ImageIcon className="h-10 w-10" />
        <p>还没有上传任何文件</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/">去上传</Link>
        </Button>
      </div>
    );
  }

  const selectionActive = selected.size > 0;

  return (
    <div className="space-y-6">
      {truncated && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          文件数量过多，仅列出了前 {initialItems.length} 个，其余文件暂未显示。
        </div>
      )}

      <div className="sticky top-0 z-10 -mx-4 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur">
        {selectionActive ? (
          <>
            <span className="text-sm font-medium">已选择 {selected.size} 项</span>
            <div className="flex items-center gap-2">
              {confirmBatch ? (
                <>
                  <span className="text-sm text-destructive">确认删除 {selected.size} 个文件？此操作不可恢复</span>
                  <Button size="sm" variant="outline" onClick={() => setConfirmBatch(false)}>取消</Button>
                  <Button size="sm" variant="destructive" onClick={handleBatchDelete}>确认删除</Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={selected.size === sorted.length}
                    onClick={() => setSelected(new Set(sorted.map(i => i.path)))}
                  >
                    全选 ({sorted.length})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>取消选择</Button>
                  <Button size="sm" variant="destructive" onClick={() => setConfirmBatch(true)}>删除所选</Button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">
              共 {items.length} 个文件 · {formatBytes(totalSize)}
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(sorted.map(i => i.path)))}>全选</Button>
              <select
                aria-label="排序方式"
                value={sort}
                onChange={e => setSort(e.target.value as SortKey)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
              >
                <option value="newest">最新上传</option>
                <option value="oldest">最早上传</option>
                <option value="largest">体积最大</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] sm:gap-6">
        {visible.map(item => (
          <FileCard
            key={item.path}
            item={item}
            selected={selected.has(item.path)}
            selectionActive={selectionActive}
            deleting={deleting.has(item.path)}
            onToggleSelect={toggleSelect}
            onDelete={path => removeFiles([path])}
          />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <Button variant="ghost" size="sm" onClick={() => setLimit(l => l + PAGE_SIZE)}>
            加载更多（{sorted.length - visible.length}）
          </Button>
        </div>
      )}
    </div>
  );
}
