import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../services/api'
import { CACHE_KEYS } from '../queryClient'
import type { DashboardStats, RecentActivity } from '../types'

export function useDashboardStats() {
  return useQuery({
    queryKey: CACHE_KEYS.dashboard.stats,
    queryFn: async (): Promise<DashboardStats> => {
      return apiClient.get('/dashboard/stats')
    },
    staleTime: 1000 * 60 * 2, // 2 minutes for dashboard stats
  })
}

export function useRecentActivity(limit: number = 10) {
  return useQuery({
    queryKey: [...CACHE_KEYS.dashboard.recentActivity, limit],
    queryFn: async (): Promise<RecentActivity[]> => {
      return apiClient.get('/dashboard/activity', { limit })
    },
    staleTime: 1000 * 60 * 1, // 1 minute for recent activity
  })
} 