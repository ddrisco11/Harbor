export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-xl font-medium mb-4">Documents</h2>
          <p className="text-gray-700">Manage your Google Drive documents</p>
        </div>
        <div className="card">
          <h2 className="text-xl font-medium mb-4">Search</h2>
          <p className="text-gray-700">AI-powered document search</p>
        </div>
        <div className="card">
          <h2 className="text-xl font-medium mb-4">PDF Templates</h2>
          <p className="text-gray-700">Create and fill PDF forms</p>
        </div>
      </div>
    </div>
  )
} 