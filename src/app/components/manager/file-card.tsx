'use client';

import { useState, useSyncExternalStore } from 'react';
import { CopyIcon, ExternalLinkIcon, ImageIcon, TrashIcon } from '@radix-ui/react-icons';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/app/components/ui/dropdown-menu';
import { useToast } from '@/app/components/ui/use-toast';
import { ChevronDownIcon } from '@/app/components/icon/chevron-down-icon';
import { UrlIcon } from '@/app/components/icon/url-icon';
import { MarkdownIcon } from '@/app/components/icon/markdown-icon';
import { HtmlIcon } from '@/app/components/icon/html-icon';
import { BBCodeIcon } from '@/app/components/icon/bb-code-icon';
import type { LinkType } from '@/app/lib/link-format';
import { filePath, formatLink } from '@/app/lib/link-format';
import type { FileItem } from '@/app/provider/storage-provider';
import { cn, formatBytes } from '@/app/lib/utils';

function unsubscribe() {
  // 客户端状态不会变化，无需取消订阅
}
function subscribe() {
  return unsubscribe;
}
/** 服务端渲染时为 false，水合之后为 true，用来避免时区/语言不同导致的 hydration mismatch */
function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

function LocalDate({ iso }: { iso: string }) {
  const isClient = useIsClient();
  const date = new Date(iso);
  return (
    <time dateTime={iso} title={isClient ? date.toLocaleString() : undefined}>
      {isClient ? date.toLocaleDateString() : iso.slice(0, 10)}
    </time>
  );
}

export interface FileCardProps {
  item: FileItem
  selected: boolean
  /** 当前是否有任何文件被选中，用来决定复选框是否常驻显示 */
  selectionActive: boolean
  deleting: boolean
  onToggleSelect: (path: string) => void
  onDelete: (path: string) => void
}

export function FileCard({ item, selected, selectionActive, deleting, onToggleSelect, onDelete }: FileCardProps) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [broken, setBroken] = useState(false);

  const src = filePath(item.path);

  const copy = async (type: LinkType) => {
    try {
      const url = new URL(src, window.location.origin).href;
      await navigator.clipboard.writeText(formatLink(type, url, item.path));
      toast({ description: '🎉 已复制到剪贴板' });
    } catch {
      toast({ variant: 'destructive', title: '复制失败，请检查浏览器剪贴板权限' });
    }
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-shadow',
        selected && 'ring-2 ring-primary',
        deleting && 'pointer-events-none opacity-50'
      )}
    >
      <div className="relative aspect-square bg-muted">
        {broken ? (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        ) : (
          <a href={src} target="_blank" rel="noreferrer" className="block h-full w-full">
            <img
              src={src}
              alt={item.path}
              loading="lazy"
              decoding="async"
              onError={() => setBroken(true)}
              className="h-full w-full object-cover"
            />
          </a>
        )}
        <label
          className={cn(
            'absolute left-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-background/80 shadow backdrop-blur transition-opacity focus-within:opacity-100',
            selected || selectionActive ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
          )}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.path)}
            aria-label={`选择 ${item.path}`}
            className="h-4 w-4 cursor-pointer accent-primary"
          />
        </label>
      </div>

      <div className="space-y-2 p-3">
        <div className="truncate font-mono text-xs font-medium" title={item.path}>{item.path}</div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatBytes(item.size)}</span>
          <LocalDate iso={item.uploaded} />
        </div>

        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs text-destructive">确认删除？</span>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>取消</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                onDelete(item.path);
              }}
            >
              删除
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="min-w-0 flex-1 rounded-r-none" aria-label="复制链接" onClick={() => copy('url')}>
              <CopyIcon className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">复制链接</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="-ml-1 rounded-l-none px-2" aria-label="更多复制格式">
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => copy('url')}>
                  <UrlIcon className="mr-1.5 h-4 w-4" /> URL
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => copy('markdown')}>
                  <MarkdownIcon className="mr-1.5 h-4 w-4" /> Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => copy('html')}>
                  <HtmlIcon className="mr-1.5 h-4 w-4" /> HTML
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => copy('bbCode')}>
                  <BBCodeIcon className="mr-1.5 h-4 w-4" /> BBCode
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
              <a href={src} target="_blank" rel="noreferrer" aria-label="在新标签页打开">
                <ExternalLinkIcon className="h-4 w-4" />
              </a>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              aria-label="删除"
              onClick={() => setConfirming(true)}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
