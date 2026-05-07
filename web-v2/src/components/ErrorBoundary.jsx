import { Component } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => window.location.reload();

  handleRestart = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRestart?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;
    const isCameraError =
      error?.message?.includes('camera') ||
      error?.message?.includes('getUserMedia') ||
      error?.message?.includes('MediaDevices');

    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[var(--color-surface)]">
        <Card className="max-w-xl w-full p-8 text-center" role="alert">
          <div className="h-12 w-12 mx-auto rounded-full bg-[var(--color-coral-soft)] flex items-center justify-center text-[var(--color-coral)] mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
            {isCameraError ? 'Camera access error' : 'Something went wrong'}
          </h2>
          <p className="mt-3 text-sm text-[var(--color-muted)] leading-relaxed">
            {isCameraError
              ? 'Unable to access your camera. Please check browser permissions and ensure no other app is using it.'
              : 'An unexpected error occurred while running the app. You can try again or refresh the page.'}
          </p>
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <Button variant="secondary" onClick={this.handleReload}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button onClick={this.handleRestart}>
              <RotateCcw className="h-4 w-4" /> Try again
            </Button>
          </div>
          {error && (
            <details className="mt-6 text-left text-xs text-[var(--color-faint)]">
              <summary className="cursor-pointer">Technical details</summary>
              <pre className="mt-2 p-3 rounded bg-[var(--color-surface)] overflow-auto whitespace-pre-wrap break-words scrollbar-thin">
                {String(error)}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </Card>
      </div>
    );
  }
}
