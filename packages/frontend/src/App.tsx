import { Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Suspense, lazy } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { AuthProvider } from './providers/AuthProvider'
import { queryClient } from './common/api/queryClient'
import { ErrorBoundary } from './common/components'

// Pages that don't need lazy loading
import LoginPage from './pages/LoginPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import SettingsPage from './pages/SettingsPage'

// Lazy-loaded feature modules
const Dashboard = lazy(() => import('./features/dashboard').then(m => ({ default: m.Dashboard })))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const PDFTemplatesPage = lazy(() => import('./pages/PDFTemplatesPage'))

// Components
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'
import ProtectedRoute from './components/ProtectedRoute'

function LazyLoadingFallback() {
  return (
    <div className="min-h-96 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}

function AppRoutes() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Handle OAuth callback route (should be accessible without authentication)
  if (window.location.pathname === '/auth/callback') {
    return <OAuthCallbackPage />
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <Layout>
      <ErrorBoundary>
        <Suspense fallback={<LazyLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={
              <ProtectedRoute>
                <DocumentsPage />
              </ProtectedRoute>
            } />
            <Route path="/search" element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            } />
            <Route path="/templates" element={
              <ProtectedRoute>
                <PDFTemplatesPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  )
}

export default App 