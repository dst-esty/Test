import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Expedition ErrorBoundary] Uncaught runtime error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0c0a09] text-stone-200">
          <div className="w-full max-w-md bg-stone-900 border-2 border-amber-800/80 rounded-2xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-950/80 border border-amber-600/50 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-serif font-bold text-amber-300">
              Expedition Interrupted
            </h2>
            <p className="text-xs text-stone-400 leading-relaxed font-sans">
              The 3D exploration canvas encountered an unexpected runtime condition or graphics reset.
            </p>
            {this.state.error?.message && (
              <div className="p-2.5 bg-black/50 border border-stone-800 rounded-lg text-[11px] font-mono text-stone-400 text-left overflow-auto max-h-24">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-amber-800 hover:bg-amber-700 text-amber-100 font-sans font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Expedition
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
