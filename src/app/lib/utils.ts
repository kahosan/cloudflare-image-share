import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const characterCount = characters.length;
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  let result = '';
  for (let i = 0; i < length; i++)
    result += characters[randomValues[i] % characterCount];

  return result;
}

/** 返回小写扩展名（不含点），没有扩展名时返回空字符串 */
export function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase();
}

export function formatFileSize(fileSizeMB: number) {
  if (fileSizeMB < 1)
    return `${(fileSizeMB * 1000).toFixed(0)} KB`;

  return `${fileSizeMB.toFixed(0)} MB`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => { const _ = setTimeout(resolve, ms); });
}
