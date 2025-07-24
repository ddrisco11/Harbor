import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { DashboardView } from './DashboardView'
import { useDashboardStats, useRecentActivity, useSyncDocuments } from '../../../common/api/hooks'
import { invalidateDashboardCache } from '../../../common/utils'
import { ErrorBoundary } from '../../../common/components'
import toast from 'react-hot-toast'

export function DashboardContainer() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Data fetching hooks
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useDashboardStats()

  const {
    data: recentActivity,
    isLoading: isLoadingActivity,
    error: activityError,
    refetch: refetchActivity,
  } = useRecentActivity(10)

  // Mutations
  const syncMutation = useSyncDocuments()

  // Handlers
  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchStats(),
        refetchActivity(),
      ])
      toast.success('Dashboard data refreshed')
    } catch (error) {
      toast.error('Failed to refresh dashboard data')
    }
  }

  const handleSyncDocuments = async () => {
    try {
      const result = await syncMutation.mutateAsync()
      toast.success(`Successfully synced ${result.syncedCount} documents`)
      invalidateDashboardCache(queryClient)
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync documents')
    }
  }

  const handleNavigate = (path: string) => {
    navigate(path)
  }

  // Error handling
  if (statsError || activityError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium mb-2">Failed to load dashboard</h3>
          <p className="text-red-700 text-sm mb-3">
            {statsError?.message || activityError?.message || 'Unknown error occurred'}
          </p>
          <button
            onClick={handleRefresh}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <DashboardView
        stats={stats}
        recentActivity={recentActivity}
        isLoadingStats={isLoadingStats}
        isLoadingActivity={isLoadingActivity}
        onRefresh={handleRefresh}
        onSyncDocuments={handleSyncDocuments}
        onNavigate={handleNavigate}
      />
    </ErrorBoundary>
  )
} 