import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../services/api'
import { CACHE_KEYS } from '../queryClient'
import type { Document, DocumentFilters, PaginatedResponse } from '../types'

export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: CACHE_KEYS.documents.list(filters),
    queryFn: async (): Promise<PaginatedResponse<Document>> => {
      return apiClient.get('/documents', filters)
    },
  })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: CACHE_KEYS.documents.detail(id),
    queryFn: async (): Promise<Document> => {
      return apiClient.get(`/documents/${id}`)
    },
    enabled: !!id,
  })
}

export function useSyncDocuments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<{ message: string; syncedCount: number }> => {
      return apiClient.post('/documents/sync')
    },
    onSuccess: () => {
      // Invalidate documents list and dashboard stats
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.dashboard.stats })
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.dashboard.recentActivity })
    },
  })
} 