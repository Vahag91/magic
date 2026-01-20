import * as React from 'react';
import ErrorFallbackScreen from './ErrorFallbackScreen';
import { reportError } from '../lib/errorReporting';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    reportError(error, { source: 'ErrorBoundary', errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry() {
    this.setState({ error: null });
    this.props.onRetry?.();
  }

  render() {
    const { error } = this.state;
    if (error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({ error, onRetry: this.handleRetry });
      }
      return <ErrorFallbackScreen onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

