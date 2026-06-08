'use client';

import React, { ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught rendering error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="glass-panel border-red-900/50 bg-red-950/10 rounded-2xl p-8 text-center max-w-xl mx-auto my-12 space-y-6">
          <div className="w-16 h-16 bg-red-900/20 border border-red-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(239,68,68,0.1)]">
            <AlertOctagon className="w-7 h-7 text-red-400" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-100">Application View Crashed</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              We encountered a rendering exception while parsing the dynamic metadata parameters of this view.
            </p>
          </div>

          {this.state.error && (
            <div className="bg-slate-950 border border-slate-900 rounded-lg p-3 text-left font-mono text-[10px] text-red-300 max-h-24 overflow-y-auto">
              {this.state.error.message}
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 px-4 py-2 rounded-lg flex items-center gap-1.5 text-xs mx-auto transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry View Load
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
