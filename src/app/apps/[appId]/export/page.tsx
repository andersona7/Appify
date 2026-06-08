import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import GithubExportClient from '@/components/GithubExportClient';

export const dynamic = 'force-dynamic';

interface PageParams {
  params: Promise<{
    appId: string;
  }>;
}

export default async function ExportPage({ params }: PageParams) {
  const { appId } = await params;

  const app = await prisma.app.findUnique({
    where: { id: appId },
  });

  if (!app) {
    notFound();
  }

  return (
    <GithubExportClient
      appId={app.id}
      appName={app.name}
    />
  );
}
