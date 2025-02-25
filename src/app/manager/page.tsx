import { Card } from '../components/ui/card';
import { getStorageProvider } from '../provider/storage-provider';

export const runtime = 'edge';

export default async function Manager() {
  const r2 = getStorageProvider();
  const data = await r2.getKeys?.();

  return (
    <div className="max-w-6xl mx-auto px-4 grid sm:grid-cols-[repeat(auto-fill,minmax(16rem,auto))] grid-cols-[repeat(auto-fill,minmax(10rem,auto))] gap-8 pt-24">
      {data?.map(item => (
        <Card key={item.path} className="relative h-full w-full">
          <img
            src={`/file/${item.path}`}
            alt={item.path}
            className="bg-cover"
          />
          <div className="font-mono font-medium text-center my-2">{item.path}</div>
        </Card>
      ))}
    </div>
  );
}
