import type { DragEvent } from 'react';
import { getFileExtension } from '@/app/lib/utils';
import { useToast } from '@/app/components/ui/use-toast';

type FileDropZoneProps = React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>
  onFileDrop: (file: File) => void
  /** 以逗号分隔的扩展名列表，如 ".jpg,.png" */
  accept: string
};

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
}

function FileDropZone({ ref, className, children, onFileDrop, accept, ...props }: FileDropZoneProps) {
  const { toast } = useToast();

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    // 拖入的可能不是文件（比如选中的文字），此时 files 为空
    const file = event.dataTransfer.files.item(0);
    if (!file)
      return;

    if (accept && !checkFileType(file.name, accept)) {
      toast({
        variant: 'destructive',
        title: '不支持的文件类型'
      });
      return;
    }
    onFileDrop(file);
  };

  return (
    <div
      ref={ref}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}

FileDropZone.displayName = 'FileDropZone';

export default FileDropZone;

function checkFileType(filename: string, accept: string) {
  const extName = '.' + getFileExtension(filename);
  return accept.split(',').some(type => type.trim() === extName);
}
