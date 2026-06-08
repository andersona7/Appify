import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    appId: string;
  }>;
}

export default async function AppPageRoot({ params }: PageProps) {
  const { appId } = await params;

  // Find the app and its first page sorted by creation date
  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      pages: { orderBy: { createdAt: 'asc' }, take: 1 },
    },
  });

  if (!app) {
    notFound();
  }

  // Redirect to first page slug or fall back to dashboard
  if (app.pages.length > 0) {
    redirect(`/apps/${app.id}/${app.pages[0].slug}`);
  }

  redirect('/');
}
