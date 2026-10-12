/** 允许上传 / 对外提供的图片类型，客户端校验、服务端校验、文件响应共用这一份 */
export const IMAGE_TYPES = {
  'image/jpeg': { extension: 'jpg', label: 'JPG' },
  'image/png': { extension: 'png', label: 'PNG' },
  'image/gif': { extension: 'gif', label: 'GIF' },
  'image/webp': { extension: 'webp', label: 'WebP' },
  'image/avif': { extension: 'avif', label: 'AVIF' }
} as const;

export type ImageMime = keyof typeof IMAGE_TYPES;

export const IMAGE_MIME_TYPES = Object.keys(IMAGE_TYPES) as ImageMime[];

/** <input accept> / 拖拽校验使用 */
export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.avif';

export const IMAGE_TYPES_HINT = Object.values(IMAGE_TYPES).map(t => t.label).join('、');

const EXTENSION_TO_MIME: Record<string, ImageMime> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif'
};

export function mimeFromExtension(extension: string): ImageMime | null {
  return EXTENSION_TO_MIME[extension.toLowerCase()] ?? null;
}

/** 浏览器端的初步判断：优先看 MIME，MIME 为空（部分系统/拖拽）时看扩展名。最终以服务端魔数嗅探为准 */
export function isSupportedImage(file: { name: string, type: string }): boolean {
  if (file.type)
    return (IMAGE_MIME_TYPES as string[]).includes(file.type);

  const dot = file.name.lastIndexOf('.');
  return dot !== -1 && mimeFromExtension(file.name.slice(dot + 1)) !== null;
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((b, i) => bytes[offset + i] === b);
}

/**
 * 通过文件头魔数判断真实类型，不信任客户端声明的 MIME 和文件名。
 * 至少需要前 12 个字节。
 */
export function sniffImageType(bytes: Uint8Array): ImageMime | null {
  if (startsWith(bytes, [0xFF, 0xD8, 0xFF]))
    return 'image/jpeg';

  if (startsWith(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
    return 'image/png';

  // "GIF87a" / "GIF89a"
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61)
    return 'image/gif';

  // "RIFF" ???? "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return 'image/webp';

  // ???? "ftyp" + 品牌 "avif" / "avis"
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)
    && (startsWith(bytes, [0x61, 0x76, 0x69, 0x66], 8) || startsWith(bytes, [0x61, 0x76, 0x69, 0x73], 8)))
    return 'image/avif';

  return null;
}
