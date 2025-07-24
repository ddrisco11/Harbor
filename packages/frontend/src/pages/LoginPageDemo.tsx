import { useState } from 'react'
import toast from 'react-hot-toast'

export default function LoginPageDemo() {
  const [isLoading, setIsLoading] = useState(false)

  const handleClientSideAuth = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Fetch the auth URL from the backend
      const response = await fetch('/api/auth/google')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.authUrl) {
        throw new Error('No auth URL received from server')
      }

      // Redirect to Google's consent screen
      window.location.href = data.authUrl
    } catch (error) {
      console.error('Google sign-in error:', error)
      toast.error('Failed to initiate Google sign-in. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-center mb-8">Google Auth Implementation Demo</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Client-side Flow */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Approach 1: Client-side Flow</h2>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium mb-2">How it works:</h3>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Click button prevents default navigation</li>
                <li>2. JavaScript fetches auth URL from <code>/api/auth/google</code></li>
                <li>3. Parses JSON response to extract authUrl</li>
                <li>4. Redirects browser: <code>window.location.href = authUrl</code></li>
                <li>5. Handles errors with logging and alerts</li>
              </ol>
            </div>
            <button 
              onClick={handleClientSideAuth}
              disabled={isLoading}
              className={`btn-primary w-full justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Redirecting...' : 'Sign in with Google (Client-side)'}
            </button>
          </div>

          {/* Server-side Redirect */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Approach 2: Server-side Redirect</h2>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium mb-2">How it works:</h3>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Simple anchor link navigation</li>
                <li>2. Server endpoint <code>/api/auth/google/redirect</code></li>
                <li>3. Backend calls <code>res.redirect(authUrl)</code></li>
                <li>4. Browser automatically follows 302 redirect</li>
                <li>5. No client-side JavaScript required</li>
              </ol>
            </div>
            <a 
              href="/api/auth/google/redirect" 
              className="btn-primary w-full justify-center"
            >
              Sign in with Google (Server-side)
            </a>
          </div>
        </div>

        <div className="mt-8 card">
          <h3 className="text-lg font-semibold mb-4">Configuration Notes:</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Update your Google OAuth2 redirect URI in the Google Cloud Console to:
              <code className="ml-2 bg-yellow-100 px-2 py-1 rounded">http://localhost:3000/auth/callback</code>
            </p>
            <p className="text-sm text-yellow-800 mt-2">
              Also update your <code>.env</code> file:
              <code className="ml-2 bg-yellow-100 px-2 py-1 rounded">GOOGLE_REDIRECT_URI="http://localhost:3000/auth/callback"</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 