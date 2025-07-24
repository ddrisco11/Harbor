import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../services/api'
import { CACHE_KEYS } from '../queryClient'
import type { SearchResult, SearchFilters, PaginatedResponse } from '../types'

interface UseSearchOptions {
  enabled?: boolean
  staleTime?: number
}

export function useSearch(
  query: string, 
  filters?: SearchFilters,
  options: UseSearchOptions = {}
) {
  return useQuery({
    queryKey: CACHE_KEYS.search.results(query, filters),
    queryFn: async (): Promise<PaginatedResponse<SearchResult>> => {
      return apiClient.get('/search', { 
        q: query,
        ...filters 
      })
    },
    enabled: options.enabled !== false && query.length > 0,
    staleTime: options.staleTime ?? 1000 * 60 * 5, // 5 minutes
  })
} 