export default function Layout({ children }: { children: any }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        {children}
      </div>
    </div>
  )
} 