import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function OAuthCallbackPage() {
  const { login, updateUser } = useAuth()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract authorization code from URL
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const error = urlParams.get('error')

        if (error) {
          throw new Error(`OAuth error: ${error}`)
        }

        if (!code) {
          throw new Error('No authorization code received')
        }

        // Send code to backend
        const response = await fetch('/api/auth/google/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Authentication failed')
        }

        const data = await response.json()

        // Store tokens and user info
        login({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
        updateUser(data.user)

        setStatus('success')
        toast.success('Successfully signed in!')

        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/'
        }, 1000)

      } catch (error) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        toast.error(error instanceof Error ? error.message : 'Authentication failed')
        
        // Redirect to login after error
        setTimeout(() => {
          window.location.href = '/login'
        }, 3000)
      }
    }

    handleCallback()
  }, [login, updateUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="card w-full max-w-md text-center">
        {status === 'processing' && (
          <>
            <LoadingSpinner size="lg" />
            <h2 className="text-xl font-semibold mt-4 mb-2">Completing Sign In</h2>
            <p className="text-gray-600">Please wait while we authenticate you...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-semibold mb-2">Sign In Successful!</h2>
            <p className="text-gray-600">Redirecting to your dashboard...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h2 className="text-xl font-semibold mb-2">Sign In Failed</h2>
            <p className="text-gray-600">Redirecting back to login...</p>
          </>
        )}
      </div>
    </div>
  )
} 