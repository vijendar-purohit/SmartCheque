/**
 * ErrorBoundary — catches render crashes and shows a graceful "reload"
 * panel. Wraps the entire <App> in main.jsx.
 */
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7fafd] p-6">
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm max-w-md w-full p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#1c104b] mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-6">
              The app crashed unexpectedly. Your data is safe — try reloading.
            </p>
            <pre className="text-[10px] text-left text-red-700 bg-red-50 border border-red-100 rounded p-3 mb-5 max-h-32 overflow-auto font-mono whitespace-pre-wrap">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-[#1c104b] text-white font-bold rounded-xl hover:bg-[#2d1f60] active:scale-[0.98] transition-all"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}