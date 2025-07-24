import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

// Cache keys for consistent cache management
export const CACHE_KEYS = {
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    recentActivity: ['dashboard', 'recentActivity'] as const,
  },
  documents: {
    list: (filters?: Record<string, any>) => ['documents', 'list', filters] as const,
    detail: (id: string) => ['documents', 'detail', id] as const,
  },
  search: {
    results: (query: string, filters?: Record<string, any>) => 
      ['search', 'results', query, filters] as const,
  },
  templates: {
    list: ['templates', 'list'] as const,
    detail: (id: string) => ['templates', 'detail', id] as const,
    fillHistory: ['templates', 'fillHistory'] as const,
  },
  user: {
    profile: ['user', 'profile'] as const,
  },
} as const 