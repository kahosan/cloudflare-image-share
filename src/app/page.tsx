import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/app/lib/auth';
import { getConfig } from '@/app/lib/config';
import { ImgUpload } from '@/app/components/img-upload';

export default async function Home() {
  if (!await isAuthenticated())
    redirect('/login');

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="relative w-full">
        <ImgUpload {...getConfig()} />
        <div className="
        absolute opacity-50 -z-20 top-1/2 left-1/2 ml-[-40px] mt-[30px] h-[240px]  translate-x-1/3 bg-gradient-conic from-emerald-100 via-green-200 blur-2xl content-['']
        sm:w-[240px]
        "
        />
      </div>
    </div>
  );
}
