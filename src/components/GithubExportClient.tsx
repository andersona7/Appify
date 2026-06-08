'use client';

import { useState } from 'react';
import { FolderGit, CheckCircle2, ArrowRight, Loader2, FileText, Code } from 'lucide-react';

interface GithubExportClientProps {
  appId: string;
  appName: string;
}

export default function GithubExportClient({ appId, appName }: GithubExportClientProps) {
  const [repoName, setRepoName] = useState(appName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  const [githubToken, setGithubToken] = useState('ghp_mock_token_to_preview_compiled_files');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  // Tab state for previewing code
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setActiveTab(null);

    try {
      const res = await fetch(`/api/v1/apps/${appId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoName, githubToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to export repository');
      }

      setResult(data);
      if (data.dryRun && data.files) {
        setActiveTab(Object.keys(data.files)[0]); // Default to first file tab
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during export.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel border-slate-900 rounded-xl p-6 relative overflow-hidden space-y-6">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-600 to-indigo-600"></div>

      <div>
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          GitHub Repository Export Utility
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Compile this dynamic workspace into a standalone, compilable Next.js 15 + Prisma PostgreSQL codebase.
        </p>
      </div>

      {!result && (
        <form onSubmit={handleExport} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">Repository Name</label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-855 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">GitHub Personal Access Token (PAT)</label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-855 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="ghp_..."
                required
              />
              <span className="text-[10px] text-slate-600 block">
                Use the default mock token to run a compilation preview of the files.
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-950/20 border border-red-900/50 text-red-400 p-3 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer shadow-md disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Compiling & Pushing...
                </>
              ) : (
                <>
                  <FolderGit className="w-3.5 h-3.5" />
                  Export to GitHub Repository
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* EXPORT COMPLETED - PREVIEW PANEL */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 p-4 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-slate-100">Export Complete!</h4>
              <p className="text-xs text-slate-400 mt-1">{result.message}</p>
              {result.repoUrl && (
                <a
                  href={result.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-violet-400 hover:underline mt-2 inline-block font-semibold"
                >
                  Open exported GitHub repository &rarr;
                </a>
              )}
            </div>
          </div>

          {result.dryRun && result.files && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Code className="w-4 h-4 text-violet-400" />
                Compiled Source Code Preview
              </h4>

              {/* Code File Tabs */}
              <div className="flex border-b border-slate-900 overflow-x-auto">
                {Object.keys(result.files).map((filename) => (
                  <button
                    key={filename}
                    onClick={() => setActiveTab(filename)}
                    className={`px-4 py-2 text-xs font-mono border-b-2 whitespace-nowrap cursor-pointer transition-all ${
                      activeTab === filename
                        ? 'border-violet-500 text-slate-100 font-bold bg-slate-950/45'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {filename}
                  </button>
                ))}
              </div>

              {/* Fenced Code Block Display */}
              {activeTab && result.files[activeTab] && (
                <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-x-auto max-h-[350px] relative">
                  <span className="absolute top-2 right-4 text-[9px] text-slate-600 font-mono">
                    {activeTab.endsWith('.prisma') ? 'PRISMA SCHEMA' : activeTab.endsWith('.json') ? 'JSON' : 'MARKDOWN'}
                  </span>
                  <pre className="text-xs font-mono text-slate-300 leading-relaxed">
                    <code>{result.files[activeTab]}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-start">
            <button
              onClick={() => setResult(null)}
              className="bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-xs cursor-pointer"
            >
              Export another configuration
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
