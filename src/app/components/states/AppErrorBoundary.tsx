import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[AppErrorBoundary] Uncaught render error:", error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
          <div className="rounded-xl border border-red-200 bg-white p-8 shadow-sm max-w-md w-full">
            <h1 className="text-lg font-semibold text-slate-900">Algo ha salido mal</h1>
            <p className="mt-2 text-sm text-slate-500">
              Se ha producido un error inesperado. Puedes intentar recargar la página o volver al inicio.
            </p>
            {this.state.error && (
              <pre className="mt-3 max-h-24 overflow-auto rounded bg-slate-100 px-3 py-2 text-left text-xs text-red-600">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                onClick={() => window.location.reload()}
              >
                Recargar página
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={this.handleReset}
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
