import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../services/api'
import { CACHE_KEYS } from '../queryClient'
import type { Template, FillJob, PaginatedResponse } from '../types'

export function useTemplates() {
  return useQuery({
    queryKey: CACHE_KEYS.templates.list,
    queryFn: async (): Promise<PaginatedResponse<Template>> => {
      return apiClient.get('/templates')
    },
  })
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: CACHE_KEYS.templates.detail(id),
    queryFn: async (): Promise<Template> => {
      return apiClient.get(`/templates/${id}`)
    },
    enabled: !!id,
  })
}

export function useFillHistory() {
  return useQuery({
    queryKey: CACHE_KEYS.templates.fillHistory,
    queryFn: async (): Promise<PaginatedResponse<FillJob>> => {
      return apiClient.get('/templates/fills')
    },
  })
}

export function useFillTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { templateId: string; fieldValues: Record<string, any> }): Promise<FillJob> => {
      return apiClient.post('/templates/fill', data)
    },
    onSuccess: () => {
      // Invalidate fill history and dashboard stats
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.templates.fillHistory })
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.dashboard.stats })
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.dashboard.recentActivity })
    },
  })
} 