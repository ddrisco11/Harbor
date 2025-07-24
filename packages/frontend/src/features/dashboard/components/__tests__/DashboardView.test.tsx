import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { DashboardView } from '../DashboardView'
import type { DashboardStats, RecentActivity } from '../../../../common/api/types'

const mockStats: DashboardStats = {
  totalDocuments: 150,
  totalTemplates: 12,
  recentSearches: 45,
  templatesUsedThisWeek: 8,
  documentsIndexedToday: 5,
  lastSyncTime: '2023-12-10T14:30:00Z',
}

const mockRecentActivity: RecentActivity[] = [
  {
    id: '1',
    type: 'search',
    title: 'Searched for "contract templates"',
    description: 'Found 15 results',
    timestamp: '2023-12-10T14:00:00Z',
  },
  {
    id: '2',
    type: 'template_fill',
    title: 'Filled template "Invoice"',
    description: 'Generated invoice-123.pdf',
    timestamp: '2023-12-10T13:30:00Z',
  },
  {
    id: '3',
    type: 'document_upload',
    title: 'Document synced from Drive',
    description: 'Annual Report 2023.pdf',
    timestamp: '2023-12-10T13:00:00Z',
  },
]

const defaultProps = {
  stats: undefined,
  recentActivity: undefined,
  isLoadingStats: false,
  isLoadingActivity: false,
  onRefresh: vi.fn(),
  onSyncDocuments: vi.fn(),
  onNavigate: vi.fn(),
}

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard header', () => {
    render(<DashboardView {...defaultProps} />)
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Welcome back! Here\'s what\'s happening with your documents.')).toBeInTheDocument()
  })

  it('renders loading state for stats', () => {
    render(<DashboardView {...defaultProps} isLoadingStats={true} />)
    
    // Should show loading placeholders for stat cards
    const loadingElements = screen.getAllByRole('generic')
    const animatedElements = loadingElements.filter(el => 
      el.classList.contains('animate-pulse')
    )
    expect(animatedElements.length).toBeGreaterThan(0)
  })

  it('renders stats when data is available', () => {
    render(<DashboardView {...defaultProps} stats={mockStats} />)
    
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('renders recent activity when data is available', () => {
    render(<DashboardView {...defaultProps} recentActivity={mockRecentActivity} />)
    
    expect(screen.getByText('Searched for "contract templates"')).toBeInTheDocument()
    expect(screen.getByText('Filled template "Invoice"')).toBeInTheDocument()
    expect(screen.getByText('Document synced from Drive')).toBeInTheDocument()
  })

  it('renders loading state for activity', () => {
    render(<DashboardView {...defaultProps} isLoadingActivity={true} />)
    
    // Should show loading placeholders for activity
    const loadingElements = screen.getAllByRole('generic')
    const animatedElements = loadingElements.filter(el => 
      el.classList.contains('animate-pulse')
    )
    expect(animatedElements.length).toBeGreaterThan(0)
  })

  it('renders empty state when no activity is available', () => {
    render(<DashboardView {...defaultProps} recentActivity={[]} />)
    
    expect(screen.getByText('No recent activity')).toBeInTheDocument()
    expect(screen.getByText('Your recent actions will appear here.')).toBeInTheDocument()
  })

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = vi.fn()
    render(<DashboardView {...defaultProps} onRefresh={onRefresh} />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)
    
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('calls onSyncDocuments when sync button is clicked', () => {
    const onSyncDocuments = vi.fn()
    render(<DashboardView {...defaultProps} onSyncDocuments={onSyncDocuments} />)
    
    const syncButton = screen.getByRole('button', { name: /sync documents/i })
    fireEvent.click(syncButton)
    
    expect(onSyncDocuments).toHaveBeenCalledTimes(1)
  })

  it('calls onNavigate when stat cards are clicked', () => {
    const onNavigate = vi.fn()
    render(<DashboardView {...defaultProps} stats={mockStats} onNavigate={onNavigate} />)
    
    // Click on documents card
    const documentsCard = screen.getByText('Total Documents').closest('div')
    if (documentsCard) {
      fireEvent.click(documentsCard)
      expect(onNavigate).toHaveBeenCalledWith('/documents')
    }
  })

  it('calls onNavigate when quick action buttons are clicked', () => {
    const onNavigate = vi.fn()
    render(<DashboardView {...defaultProps} onNavigate={onNavigate} />)
    
    const searchButton = screen.getByRole('button', { name: /search documents/i })
    fireEvent.click(searchButton)
    
    expect(onNavigate).toHaveBeenCalledWith('/search')
  })

  it('disables refresh button when stats are loading', () => {
    render(<DashboardView {...defaultProps} isLoadingStats={true} />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    expect(refreshButton).toBeDisabled()
  })

  it('shows correct system status information', () => {
    render(<DashboardView {...defaultProps} stats={mockStats} />)
    
    expect(screen.getByText('System Status')).toBeInTheDocument()
    expect(screen.getByText('Last Sync:')).toBeInTheDocument()
    expect(screen.getByText('Indexed Today:')).toBeInTheDocument()
    expect(screen.getByText('5 documents')).toBeInTheDocument()
  })
}) 