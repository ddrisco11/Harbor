import { CACHE_KEYS } from '../api/queryClient'

// Local storage utilities
export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.warn(`Failed to get item from localStorage: ${key}`, error)
    return defaultValue
  }
}

export function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`Failed to set item to localStorage: ${key}`, error)
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn(`Failed to remove item from localStorage: ${key}`, error)
  }
}

// Query cache utilities
export function invalidateDashboardCache(queryClient: any) {
  queryClient.invalidateQueries({ queryKey: CACHE_KEYS.dashboard.stats })
  queryClient.invalidateQueries({ queryKey: CACHE_KEYS.dashboard.recentActivity })
}

export function invalidateDocumentsCache(queryClient: any) {
  queryClient.invalidateQueries({ queryKey: ['documents'] })
}

export function invalidateTemplatesCache(queryClient: any) {
  queryClient.invalidateQueries({ queryKey: CACHE_KEYS.templates.list })
  queryClient.invalidateQueries({ queryKey: CACHE_KEYS.templates.fillHistory })
}

// Cache keys for localStorage
export const STORAGE_KEYS = {
  SEARCH_HISTORY: 'harbor_search_history',
  USER_PREFERENCES: 'harbor_user_preferences',
  DASHBOARD_LAYOUT: 'harbor_dashboard_layout',
} as const

// Search history management
export interface SearchHistoryItem {
  query: string
  timestamp: string
  resultCount?: number
}

export function getSearchHistory(): SearchHistoryItem[] {
  return getFromStorage(STORAGE_KEYS.SEARCH_HISTORY, [])
}

export function addToSearchHistory(item: SearchHistoryItem): void {
  const history = getSearchHistory()
  const existingIndex = history.findIndex(h => h.query === item.query)
  
  if (existingIndex >= 0) {
    // Update existing entry
    history[existingIndex] = item
  } else {
    // Add new entry
    history.unshift(item)
  }
  
  // Keep only last 20 searches
  const trimmedHistory = history.slice(0, 20)
  setToStorage(STORAGE_KEYS.SEARCH_HISTORY, trimmedHistory)
}

export function clearSearchHistory(): void {
  removeFromStorage(STORAGE_KEYS.SEARCH_HISTORY)
} 