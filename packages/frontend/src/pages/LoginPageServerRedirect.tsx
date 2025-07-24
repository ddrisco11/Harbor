export default function LoginPageServerRedirect() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-semibold text-center mb-6">Harbor</h1>
        <p className="text-gray-700 text-center mb-8">
          Sign in with Google to access your documents and PDF templates
        </p>
        <p className="text-sm text-gray-500 text-center mb-4">
          Server-side redirect approach
        </p>
        <a 
          href="/api/auth/google/redirect" 
          className="btn-primary w-full justify-center"
        >
          Sign in with Google
        </a>
      </div>
    </div>
  )
} 