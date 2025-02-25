import type { DragEvent } from 'react';
import { getFileExtension } from '@/app/lib/utils';
import { useToast } from '@/app/components/ui/use-toast';

function FileDropZone({ ref, className, children, onFileDrop, accept, ...props }: React.HTMLAttributes<HTMLDivElement> & { onFileDrop: (files: FileList) => void, accept: string } & { ref?: React.RefObject<HTMLParagraphElement | null> }) {
  const { toast } = useToast();

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    const file = files[0];
    if (accept && !checkFileType(file.name, accept)) {
      toast({
        variant: 'destructive',
        title: 'File type not support.'
      });
      return;
    }
    onFileDrop(files);
  };

  return (
    <div
      ref={ref}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}

FileDropZone.displayName = 'CardTitle';

export default FileDropZone;

function checkFileType(filename: string, accept: string) {
  const allowTypes = accept.split(',').map(t => t.trim());
  const extName = '.' + getFileExtension(filename);
  for (const type of allowTypes) {
    if (type === extName)
      return true;
  }
  return false;
}
