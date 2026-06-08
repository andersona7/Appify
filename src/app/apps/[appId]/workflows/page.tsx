import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import WorkflowBuilderClient from '@/components/WorkflowBuilderClient';
import { EntityMetadata } from '@/types';

export const dynamic = 'force-dynamic';

interface PageParams {
  params: Promise<{
    appId: string;
  }>;
}

export default async function WorkflowsPage({ params }: PageParams) {
  const { appId } = await params;

  // Fetch the app definition along with custom entity tables on the server
  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      entities: true,
    },
  });

  if (!app) {
    notFound();
  }

  // Cast entity schema layouts to correct interfaces
  const typedEntities: EntityMetadata[] = app.entities.map((e: any) => ({
    name: e.name,
    displayName: e.displayName,
    fields: typeof e.schema === 'string' ? JSON.parse(e.schema) : e.schema,
  }));

  return (
    <WorkflowBuilderClient
      appId={appId}
      entities={typedEntities}
    />
  );
}
