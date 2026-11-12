import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Cube Companion render failure', error, info)
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="app-error" role="alert">
          <p className="eyebrow">Cube Companion</p>
          <h1>Something went wrong</h1>
          <p>The page could not be rendered. Reload to try the current published cube again.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </main>
      )
    }

    return this.props.children
  }
}
