'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Terminal, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AppGeneratorForm() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadingSteps = [
    'Parsing natural language description...',
    'Consulting AI Prompt Engine...',
    'Synthesizing relational metadata schema...',
    'Validating structure definitions (Zod)...',
    'Compiling PostgreSQL dynamic schemas...',
    'Initializing dynamic routing layouts...',
    'Mapping workflow automations...',
    'Application bootstapping complete! Redirecting...'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextPrompt = textareaRef.current?.value.trim() ?? '';
    if (!nextPrompt || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setStatusIndex(0);

    // Progress step simulator
    const progressInterval = setInterval(() => {
      setStatusIndex((prev) => {
        if (prev < loadingSteps.length - 2) {
          return prev + 1;
        }
        return prev;
      });
    }, 1200);

    try {
      const response = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: nextPrompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate application');
      }

      clearInterval(progressInterval);
      setStatusIndex(loadingSteps.length - 1); // Done step
      
      // Delay redirect slightly for premium UX finish feel
      setTimeout(() => {
        router.push(`/apps/${data.appId}/dashboard`);
        router.refresh();
      }, 800);

    } catch (err: any) {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {!isGenerating ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            {/* Background glowing rings */}
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-45 transition duration-500"></div>
            
            <div className="relative glass-panel rounded-2xl p-6">
              <label htmlFor="prompt" className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Describe the application you want to build:
              </label>
              
              <textarea
                ref={textareaRef}
                id="prompt"
                defaultValue=""
                onInput={(e) => setHasPrompt(e.currentTarget.value.trim().length > 0)}
                placeholder="e.g. Create a CRM for sales teams with leads, contacts, pipelines, dashboards, authentication, and workflows."
                className="w-full h-40 bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none transition-all text-base"
                required
              />

              <div className="flex justify-between items-center mt-4">
                <span className="text-xs text-slate-500">
                  Tip: Be specific about entities (e.g. leads, deals) and workflows.
                </span>
                
                <button
                  type="submit"
                  disabled={!hasPrompt}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-medium px-6 py-3 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-violet-900/30 disabled:cursor-not-allowed"
                >
                  Generate Application
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="glass-panel border-red-900/50 bg-red-950/20 text-red-400 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-red-300">Generation Failed</h4>
                <p className="text-xs mt-1 text-slate-400">{error}</p>
              </div>
            </div>
          )}
        </form>
      ) : (
        <div className="glass-panel rounded-2xl p-8 text-center space-y-6 animate-pulse border-violet-500/20">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-violet-600 rounded-full blur-xl opacity-30 animate-ping"></div>
            <div className="relative w-20 h-20 bg-slate-900 rounded-full border border-violet-500 flex items-center justify-center">
              <Terminal className="w-8 h-8 text-violet-400 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-100">Generating Platform</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Our AI engine is compiling your application in real-time. Please stand by...
            </p>
          </div>

          {/* Logging Console Display */}
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 text-left font-mono text-xs text-violet-300 max-w-lg mx-auto overflow-hidden h-24 flex flex-col justify-end">
            {loadingSteps.slice(Math.max(0, statusIndex - 2), statusIndex + 1).map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1 last:text-violet-400 last:font-bold">
                {idx === 2 || statusIndex === loadingSteps.length - 1 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-ping shrink-0" />
                )}
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
