import { cookies } from 'next/headers';
import { checkAuth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { ImgUpload } from '@/app/components/img-upload';
import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export default async function Home() {
  const c = await cookies();
  const token = c.get('token')?.value;
  const isAuth = await checkAuth(token);
  if (!isAuth)
    redirect('/login');

  const env = getRequestContext().env;
  const maxImageSize = env.MAX_IMAGE_SIZE === undefined ? 15 : Number(env.MAX_IMAGE_SIZE);
  const enableImageCompression = env.ENABLE_IMAGE_COMPRESSION === undefined || env.ENABLE_IMAGE_COMPRESSION === 'true'; // 默认打开压缩
  const compressedImageMaxSize = env.COMPRESSED_IMAGE_MAX_SIZE === undefined ? 5 : Number(env.COMPRESSED_IMAGE_MAX_SIZE);
  const maxImageWidthOrHeight = env.MAX_IMAGE_WIDTH_OR_HEIGHT === undefined ? 2560 : Number(env.MAX_IMAGE_WIDTH_OR_HEIGHT);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="relative w-full">
        <ImgUpload
          maxImageSize={maxImageSize}
          enableImageCompression={enableImageCompression}
          compressedImageMaxSize={compressedImageMaxSize}
          maxImageWidthOrHeight={maxImageWidthOrHeight}
        />
        <div className="
        absolute opacity-50 -z-20 top-1/2 left-1/2 ml-[-40px] mt-[30px] h-[240px]  translate-x-1/3 bg-gradient-conic from-emerald-100 via-green-200 blur-2xl content-['']
        sm:w-[240px]
        "
        />
      </div>
    </div>
  );
}
