import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import CsvImporterClient from '@/components/CsvImporterClient';
import { EntityMetadata } from '@/types';

export const dynamic = 'force-dynamic';

interface PageParams {
  params: Promise<{
    appId: string;
  }>;
}

export default async function ImportPage({ params }: PageParams) {
  const { appId } = await params;

  // Fetch application definition and custom tables from PostgreSQL
  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      entities: true,
    },
  });

  if (!app) {
    notFound();
  }

  // Cast schema details to correct types
  const typedEntities: EntityMetadata[] = app.entities.map((e: any) => ({
    name: e.name,
    displayName: e.displayName,
    fields: typeof e.schema === 'string' ? JSON.parse(e.schema) : e.schema,
  }));

  return (
    <CsvImporterClient
      appId={appId}
      entities={typedEntities}
    />
  );
}
