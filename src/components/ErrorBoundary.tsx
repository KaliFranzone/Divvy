import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center px-4 gap-4">
          <AlertTriangle size={48} className="text-accent" />
          <h2 className="text-xl font-bold">Algo salio mal</h2>
          <p className="text-text-secondary text-center text-sm max-w-xs">
            {this.state.error?.message || 'Error inesperado en la aplicacion'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl transition-colors"
          >
            <RotateCcw size={16} />
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
