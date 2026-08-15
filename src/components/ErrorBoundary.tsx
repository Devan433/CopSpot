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
        <div className="fixed inset-0 bg-[#0a1628] flex flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl mb-6">💥</div>
          <h1
            className="text-xl text-[#ff1744] mb-4"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            SYSTEM ERROR
          </h1>
          <p className="text-gray-400 mb-6 max-w-md">
            Something went wrong. The radar has encountered an unexpected error.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#00bcd4] text-black font-bold border-4 border-black shadow-[0_4px_0_0_#000] hover:bg-white transition-colors active:translate-y-1"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            REBOOT
          </button>
          {this.state.error && (
            <pre className="mt-6 text-xs text-gray-600 max-w-md overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
