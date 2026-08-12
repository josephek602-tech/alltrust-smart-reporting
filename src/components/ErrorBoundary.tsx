import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white max-w-md w-full p-6 rounded-2xl shadow-xl border border-slate-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Application Error</h2>
            <p className="text-sm text-slate-600">
              An unexpected error occurred while loading the application.
            </p>
            {this.state.error && (
              <div className="bg-slate-100 p-3 rounded-lg text-left text-xs font-mono text-red-700 overflow-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl flex items-center justify-center space-x-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
