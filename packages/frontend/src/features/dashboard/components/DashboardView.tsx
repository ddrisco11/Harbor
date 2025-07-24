import { Card, Button, EmptyState } from '../../../common/components'
import { formatCompactNumber, formatRelativeTime } from '../../../common/utils'
import type { DashboardStats, RecentActivity } from '../../../common/api/types'
import { FileText, Search, File, Activity, RefreshCw, Plus } from 'lucide-react'

interface DashboardViewProps {
  stats?: DashboardStats
  recentActivity?: RecentActivity[]
  isLoadingStats: boolean
  isLoadingActivity: boolean
  onRefresh: () => void
  onSyncDocuments: () => void
  onNavigate: (path: string) => void
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  onClick,
  isLoading 
}: {
  title: string
  value: string | number
  description: string
  icon: React.ComponentType<any>
  onClick?: () => void
  isLoading: boolean
}) {
  return (
    <Card
      clickable={!!onClick}
      hover={!!onClick}
      onClick={onClick}
      className="relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          </div>
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {typeof value === 'number' ? formatCompactNumber(value) : value}
              </p>
              <p className="text-sm text-gray-600">{description}</p>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

function ActivityItem({ activity }: { activity: RecentActivity }) {
  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'search':
        return Search
      case 'template_fill':
        return File
      case 'document_upload':
        return FileText
      case 'sync':
        return RefreshCw
      default:
        return Activity
    }
  }

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'search':
        return 'text-blue-600'
      case 'template_fill':
        return 'text-green-600'
      case 'document_upload':
        return 'text-purple-600'
      case 'sync':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  const Icon = getActivityIcon(activity.type)

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className={`mt-0.5 ${getActivityColor(activity.type)}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {activity.title}
        </p>
        <p className="text-sm text-gray-600 truncate">
          {activity.description}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {formatRelativeTime(activity.timestamp)}
        </p>
      </div>
    </div>
  )
}

export function DashboardView({
  stats,
  recentActivity,
  isLoadingStats,
  isLoadingActivity,
  onRefresh,
  onSyncDocuments,
  onNavigate,
}: DashboardViewProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here's what's happening with your documents.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoadingStats}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSyncDocuments}
          >
            <Plus className="w-4 h-4 mr-2" />
            Sync Documents
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Documents"
          value={stats?.totalDocuments ?? 0}
          description="Documents in your Drive"
          icon={FileText}
          onClick={() => onNavigate('/documents')}
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Templates"
          value={stats?.totalTemplates ?? 0}
          description="Available PDF templates"
          icon={File}
          onClick={() => onNavigate('/templates')}
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Recent Searches"
          value={stats?.recentSearches ?? 0}
          description="Searches this week"
          icon={Search}
          onClick={() => onNavigate('/search')}
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Templates Used"
          value={stats?.templatesUsedThisWeek ?? 0}
          description="This week"
          icon={Activity}
          isLoading={isLoadingStats}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/activity')}
              >
                View All
              </Button>
            </div>

            {isLoadingActivity ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-start gap-3 py-3">
                    <div className="w-4 h-4 bg-gray-200 rounded mt-0.5"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-0">
                {recentActivity.slice(0, 8).map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Activity className="w-12 h-12" />}
                title="No recent activity"
                description="Your recent actions will appear here."
              />
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => onNavigate('/search')}
              >
                <Search className="w-4 h-4 mr-2" />
                Search Documents
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => onNavigate('/templates')}
              >
                <File className="w-4 h-4 mr-2" />
                Fill Template
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => onNavigate('/documents')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Browse Documents
              </Button>
            </div>
          </Card>

          {/* System Status */}
          <Card className="mt-4">
            <h3 className="text-md font-medium text-gray-900 mb-3">System Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Last Sync:</span>
                <span className="text-gray-900">
                  {stats?.lastSyncTime ? formatRelativeTime(stats.lastSyncTime) : 'Never'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Indexed Today:</span>
                <span className="text-gray-900">
                  {stats?.documentsIndexedToday ?? 0} documents
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
} 