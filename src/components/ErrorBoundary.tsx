"use client";

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[var(--color-cs-base)] flex flex-col items-center justify-center p-8 text-center">
          <div className="text-[var(--color-cs-red)] mb-6">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h1 className="text-xl text-[var(--color-cs-red)] mb-4 font-mono font-bold tracking-widest uppercase">
            SYSTEM ERROR
          </h1>
          <p className="text-[var(--color-cs-text-muted)] mb-6 max-w-md">
            Something went wrong. The radar has encountered an unexpected error.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-8 py-4 font-bold tracking-widest uppercase"
          >
            REBOOT
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-6 text-xs text-[var(--color-cs-text-muted)] max-w-md overflow-auto font-mono">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
