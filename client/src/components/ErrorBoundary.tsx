import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './States';

interface Props {
  children: ReactNode;
  /** Shown in place of the subtree when it throws. */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches a render-time crash and contains it.
 *
 * Without one, a single malformed chart payload unmounts the entire React tree
 * and the user is left looking at a white page with no way back — the worst
 * version of the silent failure the brief rules out. Wrapping each page means
 * a broken panel costs the user that page, and the navigation still works.
 *
 * Reset is a remount via `key`, driven by the retry button.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this is where a reporter (Sentry et al.) would be called.
    console.error('[ErrorBoundary]', this.props.label ?? 'unknown', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card">
          <ErrorState
            message={`${this.props.label ?? 'This section'} could not be displayed. The rest of the app is still available.`}
            onRetry={() => this.setState({ error: null })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
