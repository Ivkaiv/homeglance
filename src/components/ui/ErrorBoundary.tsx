'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Кастомный fallback. Получает error и reset-функцию. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Колбэк при поимке ошибки — для логирования/телеметрии. */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Ключ пересоздания: при смене значения boundary сбросится и попробует отрендерить детей заново. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prev: ErrorBoundaryProps): void {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return (
        <div className="glass p-4 text-sm text-text-secondary">
          <div className="font-medium text-red-400 mb-1">Что-то сломалось</div>
          <div className="text-xs text-text-tertiary mb-3">{this.state.error.message}</div>
          <button
            onClick={this.reset}
            className="px-3 py-1.5 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs"
          >
            Попробовать снова
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
