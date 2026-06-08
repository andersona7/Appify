import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Home, Layers, Play, Settings, LogOut, Bell, Globe, Upload } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;

  // Fetch App Definition and Pages list from PostgreSQL on the server
  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      pages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!app) {
    notFound();
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* 1. Sidebar Panel */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950/80 backdrop-blur-md flex flex-col justify-between shrink-0 sticky top-0 h-screen">
        <div className="flex flex-col">
          {/* App Header Logo */}
          <div className="h-16 px-6 border-b border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-indigo-500 to-violet-500 w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs">
                {app.name.charAt(0)}
              </span>
              <span className="font-bold text-sm text-slate-100 truncate max-w-[140px]" title={app.name}>
                {app.name}
              </span>
            </div>
            
            {/* Version indicator */}
            <span className="text-[10px] text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded font-mono">v1.0</span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 flex-1">
            <span className="block px-3 text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">
              Application Pages
            </span>

            {app.pages.map((page: any) => (
              <Link
                key={page.id}
                href={`/apps/${app.id}/${page.slug}`}
                className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all font-medium"
              >
                <Layers className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{page.title}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-slate-900 space-y-1.5 bg-slate-950/20">
          <Link
            href={`/apps/${app.id}/workflows`}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all font-medium"
          >
            <Play className="w-4 h-4 text-slate-500 shrink-0" />
            Workflow Builder
          </Link>
          <Link
            href={`/apps/${app.id}/import`}
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all font-medium"
          >
            <Upload className="w-4 h-4 text-slate-500 shrink-0" />
            CSV Ingestion
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all font-medium"
          >
            <LogOut className="w-4 h-4 text-slate-500 shrink-0" />
            Back to App Portal
          </Link>
        </div>
      </aside>

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top bar controls */}
        <header className="h-16 border-b border-slate-900 bg-slate-950/45 px-8 flex justify-between items-center shrink-0">
          <div className="text-slate-400 text-xs font-medium">
            Active Workspace ID: <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-indigo-400">{app.id}</span>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Dynamic i18n Language Switcher placeholder */}
            <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all">
              <Globe className="w-3.5 h-3.5" />
              <span>EN</span>
            </button>

            {/* GitHub Export Link (Redirect utility) */}
            <Link
              href={`/apps/${app.id}/export`}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded-lg transition-all"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              <span>Export Code</span>
            </Link>

            {/* Notification Bell */}
            <button className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700 rounded-lg relative cursor-pointer transition-all">
              <Bell className="w-3.5 h-3.5" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-violet-500 rounded-full animate-ping"></span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
