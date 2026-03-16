import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Root render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ width: '100%', maxWidth: 720, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <h1 style={{ margin: 0, marginBottom: 8, fontSize: 24 }}>App failed to render</h1>
            <p style={{ marginTop: 0, marginBottom: 12, color: '#334155' }}>
              A runtime error occurred. Open DevTools console for full details.
            </p>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12, lineHeight: 1.5, color: '#991b1b', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }}>
              {String(this.state.error?.message || this.state.error || 'Unknown error')}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <HelmetProvider>
        {clerkPublishableKey ? (
          <ClerkProvider publishableKey={clerkPublishableKey}>
            <App />
          </ClerkProvider>
        ) : (
          <App />
        )}
      </HelmetProvider>
    </RootErrorBoundary>
  </StrictMode>,
)
