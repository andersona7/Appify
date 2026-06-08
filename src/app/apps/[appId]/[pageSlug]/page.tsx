import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import PageRendererClient from '@/components/dynamic/PageRendererClient';
import { EntityMetadata } from '@/types';
import ErrorBoundary from '@/components/ErrorBoundary';

export const dynamic = 'force-dynamic';

interface PageParams {
  params: Promise<{
    appId: string;
    pageSlug: string;
  }>;
}

export default async function DynamicPage({ params }: PageParams) {
  const { appId, pageSlug } = await params;

  // 1. Fetch the Page layout definition
  const page = await prisma.page.findUnique({
    where: {
      appId_slug: {
        appId,
        slug: pageSlug,
      },
    },
  });

  if (!page) {
    notFound();
  }

  // 2. Fetch all Entities related to this App for component registry mapping
  const entities = await prisma.entity.findMany({
    where: { appId },
  });

  // Cast entity schema layouts to matching types
  const typedEntities: EntityMetadata[] = entities.map((e: any) => ({
    name: e.name,
    displayName: e.displayName,
    fields: typeof e.schema === 'string' ? JSON.parse(e.schema) : e.schema,
  }));

  return (
    <ErrorBoundary>
      <PageRendererClient
        appId={appId}
        page={page}
        entities={typedEntities}
      />
    </ErrorBoundary>
  );
}
