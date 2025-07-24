import { useState } from 'react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async (e: React.MouseEvent) => {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-semibold text-center mb-6">Harbor</h1>
        <p className="text-gray-700 text-center mb-8">
          Sign in with Google to access your documents and PDF templates
        </p>
        <button 
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className={`btn-primary w-full justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? 'Redirecting...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
} 