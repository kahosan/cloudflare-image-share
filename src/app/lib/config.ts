import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface AppConfig {
  /** 允许上传的最大文件大小，单位 MB */
  maxImageSize: number
  enableImageCompression: boolean
  /** 压缩目标大小，单位 MB；小于该值的图片不会被压缩 */
  compressedImageMaxSize: number
  maxImageWidthOrHeight: number
}

function positiveNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '')
    return fallback;

  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** 统一解析环境变量，缺省值与 README 保持一致；非法值（如 "abc"）回退到默认值而不是变成 NaN */
export function getConfig(): AppConfig {
  const env = getCloudflareContext().env;
  return {
    maxImageSize: positiveNumber(env.MAX_IMAGE_SIZE, 20),
    enableImageCompression: env.ENABLE_IMAGE_COMPRESSION === undefined || env.ENABLE_IMAGE_COMPRESSION.toLowerCase() === 'true',
    compressedImageMaxSize: positiveNumber(env.COMPRESSED_IMAGE_MAX_SIZE, 5),
    maxImageWidthOrHeight: positiveNumber(env.MAX_IMAGE_WIDTH_OR_HEIGHT, 2560)
  };
}
