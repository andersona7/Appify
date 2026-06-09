import { prisma } from '@/lib/db';
import AppGeneratorForm from '@/components/AppGeneratorForm';
import { Calendar, Layers, Activity, FileText, ArrowUpRight, Laptop } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch existing generated applications directly from PostgreSQL on the server
  let apps: any[] = [];
  try {
    apps = await prisma.app.findMany({
      include: {
        entities: { select: { name: true } },
        pages: { select: { slug: true } },
        workflows: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.error('Failed to fetch applications on landing page:', err);
  }

  return (
    <main className="min-height-screen bg-grid-pattern pb-12">
      {/* Premium Header Layout */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-100 tracking-tight">
            <span className="bg-gradient-to-r from-violet-500 to-indigo-500 w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm shadow-md shadow-violet-900/35">
              A
            </span>
            Appify <span className="text-violet-400 font-semibold text-xs px-2 py-0.5 rounded-full bg-violet-950/50 border border-violet-900/50">AI Builder</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">Welcome back, Developer</span>
            <div className="w-8 h-8 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
              DEV
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="max-w-7xl mx-auto px-6 mt-16 space-y-16">
        
        {/* Banner Hero */}
        <section className="text-center space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-100 tracking-tight leading-tight">
            Generate Production-Grade Apps <br />
            <span className="text-gradient-purple-blue">From Natural Language</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Translate requirements directly into metadata-driven SaaS platforms. Fully dynamic UIs, database models, CRUD APIs, and active workflows compiled instantly.
          </p>
        </section>

        {/* AI generator prompt container */}
        <section className="relative">
          <AppGeneratorForm />
        </section>

        {/* Generated Apps List */}
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-violet-400" />
              Your Generated Applications
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Total: {apps.length}
            </span>
          </div>

          {apps.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-slate-800">
              <Layers className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-300">No applications generated yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                Enter an application description in the prompt box above to compile your first dynamic SaaS engine.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apps.map((app: any) => (
                <div key={app.id} className="glass-card rounded-2xl p-6 flex flex-col justify-between h-56 group/card">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-lg font-bold text-slate-100 group-hover/card:text-violet-400 transition-colors truncate">
                        {app.name}
                      </h3>
                      <Link
                        href={`/apps/${app.id}/dashboard`}
                        className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {app.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* App Stats Indicators */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 border-t border-slate-900 pt-4 text-center">
                      <div className="space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold flex justify-center items-center gap-1">
                          <Layers className="w-2.5 h-2.5" /> Entities
                        </span>
                        <div className="text-sm font-bold text-slate-300">
                          {app.entities.length}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold flex justify-center items-center gap-1">
                          <FileText className="w-2.5 h-2.5" /> Pages
                        </span>
                        <div className="text-sm font-bold text-slate-300">
                          {app.pages.length}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold flex justify-center items-center gap-1">
                          <Activity className="w-2.5 h-2.5" /> Flows
                        </span>
                        <div className="text-sm font-bold text-slate-300">
                          {app.workflows.length}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(app.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <span className="truncate max-w-[150px]">ID: {app.id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
