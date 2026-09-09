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
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RustPilot UI ErrorBoundary caught an error]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#08090d] text-white flex flex-col items-center justify-center p-6 z-[99999] select-none">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-gradient-to-b from-red-950/40 via-[#0e121e] to-[#08090d] border border-red-500/40 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-white font-['Outfit']">
                Произошла ошибка отрисовки интерфейса
              </h2>
              <p className="text-xs text-slate-400">
                RustPilot перехватил сбой интерфейса и предотвратил аварийное закрытие.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-black/60 p-3 rounded-xl border border-red-500/20 text-[11px] font-mono text-red-300 max-h-40 overflow-y-auto break-all">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-white transition-all cursor-pointer"
              >
                Вернуться назад
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Перезагрузить интерфейс</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
