export const runtime = 'edge';

export default async function PreviewPage({ params }: { params: Promise<{ file: string[] }> }) {
  const p = await params;
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <img src={'/file/' + p.file.join('/')} alt={p.file.join('/')} />
    </main>
  );
}
