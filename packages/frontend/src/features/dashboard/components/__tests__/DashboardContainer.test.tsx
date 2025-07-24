import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the API hooks
vi.mock('../../../../common/api/hooks', () => ({
  useDashboardStats: vi.fn(),
  useRecentActivity: vi.fn(),
  useSyncDocuments: vi.fn(),
}))

import { DashboardContainer } from '../DashboardContainer'
import { useDashboardStats, useRecentActivity, useSyncDocuments } from '../../../../common/api/hooks'

const mockUseDashboardStats = vi.mocked(useDashboardStats)
const mockUseRecentActivity = vi.mocked(useRecentActivity)
const mockUseSyncDocuments = vi.mocked(useSyncDocuments)

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('DashboardContainer', () => {
  const mockStats = {
    totalDocuments: 150,
    totalTemplates: 12,
    recentSearches: 45,
    templatesUsedThisWeek: 8,
    documentsIndexedToday: 5,
    lastSyncTime: '2023-12-10T14:30:00Z',
  }

  const mockActivity = [
    {
      id: '1',
      type: 'search' as const,
      title: 'Searched for "contract templates"',
      description: 'Found 15 results',
      timestamp: '2023-12-10T14:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    mockUseDashboardStats.mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({ data: mockStats }),
    } as any)

    mockUseRecentActivity.mockReturnValue({
      data: mockActivity,
      isLoading: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({ data: mockActivity }),
    } as any)

    mockUseSyncDocuments.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ message: 'Success', syncedCount: 5 }),
    } as any)
  })

  it('renders dashboard data when loaded', () => {
    render(
      <TestWrapper>
        <DashboardContainer />
      </TestWrapper>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Searched for "contract templates"')).toBeInTheDocument()
  })

  it('shows loading state when data is loading', () => {
    mockUseDashboardStats.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any)

    render(
      <TestWrapper>
        <DashboardContainer />
      </TestWrapper>
    )

    // Should show loading placeholders
    const loadingElements = screen.getAllByRole('generic')
    const animatedElements = loadingElements.filter(el => 
      el.classList.contains('animate-pulse')
    )
    expect(animatedElements.length).toBeGreaterThan(0)
  })

  it('handles error state', () => {
    mockUseDashboardStats.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to fetch stats' },
      refetch: vi.fn(),
    } as any)

    render(
      <TestWrapper>
        <DashboardContainer />
      </TestWrapper>
    )

    expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('handles refresh action', async () => {
    const mockRefetchStats = vi.fn().mockResolvedValue({ data: mockStats })
    const mockRefetchActivity = vi.fn().mockResolvedValue({ data: mockActivity })

    mockUseDashboardStats.mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
      refetch: mockRefetchStats,
    } as any)

    mockUseRecentActivity.mockReturnValue({
      data: mockActivity,
      isLoading: false,
      error: null,
      refetch: mockRefetchActivity,
    } as any)

    render(
      <TestWrapper>
        <DashboardContainer />
      </TestWrapper>
    )

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(mockRefetchStats).toHaveBeenCalled()
      expect(mockRefetchActivity).toHaveBeenCalled()
    })
  })

  it('handles sync documents action', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({ message: 'Success', syncedCount: 5 })

    mockUseSyncDocuments.mockReturnValue({
      mutateAsync: mockMutateAsync,
    } as any)

    render(
      <TestWrapper>
        <DashboardContainer />
      </TestWrapper>
    )

    const syncButton = screen.getByRole('button', { name: /sync documents/i })
    fireEvent.click(syncButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled()
    })
  })
}) 