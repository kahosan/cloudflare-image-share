import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import FileDropZone from '@/app/components/file-drop-zone';
import { cn, formatFileSize } from '@/app/lib/utils';
import { UploadIcon } from '@/app/components/icon/upload-icon';
import { IMAGE_ACCEPT, IMAGE_TYPES_HINT, isSupportedImage } from '@/app/lib/image-types';

export interface FileSelectZoneRef {
  openFileSelect: () => void
}

export interface FileSelectZoneProps {
  ref?: React.Ref<FileSelectZoneRef>
  disabled?: boolean
  className?: string
  file: File | null
  /** 允许的最大文件大小，单位 MB */
  maxImageSize?: number
  onFileChange?: (file: File) => void
  onError?: (error: string) => void
}

function FileSelectZone({ ref, disabled, onFileChange, className, file, onError, maxImageSize }: FileSelectZoneProps) {
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const openFileSelect = () => {
    inputFileRef.current?.click();
  };

  useImperativeHandle(ref, () => ({
    openFileSelect
  }));

  // 用 object URL 做预览：不需要把整个文件读成 base64，并且在文件切换 / 组件卸载时释放
  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect -- 同步外部资源（object URL）的状态
      setPreviewUrl('');
      return;
    }
    // 每次 effect 都创建属于自己的 URL 并在清理时释放，StrictMode 重复执行 effect 也不会拿到已被 revoke 的 URL
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect -- 同上
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const fileChange = useCallback((file: File) => {
    if (disabled)
      return;

    if (!isSupportedImage(file)) {
      onError?.(`仅支持 ${IMAGE_TYPES_HINT} 图片`);
      return;
    }

    if (maxImageSize && file.size > (maxImageSize * 1024 * 1024)) {
      onError?.(`文件大小超过 ${formatFileSize(maxImageSize)}`);
      return;
    }
    onFileChange?.(file);
  }, [disabled, maxImageSize, onFileChange, onError]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      // 剪贴板里可能同时有文本和文件，取第一个文件；纯文本粘贴不处理
      const file = event.clipboardData?.files.item(0);
      if (file)
        fileChange(file);
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [fileChange]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.item(0);
    if (file)
      fileChange(file);

    // 清空 value，这样重复选择同一个文件也能触发 change
    e.target.value = '';
  };

  return (
    <FileDropZone
      className={cn(className, disabled ? ' opacity-50 pointer-events-none' : '')}
      onClick={openFileSelect}
      onFileDrop={fileChange}
      aria-disabled={disabled}
      accept={IMAGE_ACCEPT}
    >
      <input
        className="hidden"
        ref={inputFileRef}
        disabled={disabled}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={handleFileInputChange}
      />
      {previewUrl ? (
        <div className="w-full h-full p-2 flex items-center justify-center">
          <img src={previewUrl} className="object-scale-down max-h-full rounded-md m-auto" alt="预览" />
        </div>
      ) : (
        <>
          <UploadIcon className="w-8 h-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">点击选择、拖拽或粘贴图片</p>
        </>
      )}
    </FileDropZone>
  );
}

FileSelectZone.displayName = 'FileSelectZone';

export { FileSelectZone };
