export interface DashboardStats {
  totalDocuments: number
  totalTemplates: number
  recentSearches: number
  templatesUsedThisWeek: number
  documentsIndexedToday: number
  lastSyncTime: string
}

export interface RecentActivity {
  id: string
  type: 'search' | 'template_fill' | 'document_upload' | 'sync'
  title: string
  description: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface Document {
  id: string
  name: string
  mimeType: string
  size: number
  createdTime: string
  modifiedTime: string
  webViewLink?: string
  thumbnailLink?: string
  isIndexed: boolean
  embeddingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  tags?: string[]
}

export interface SearchResult {
  id: string
  documentId: string
  documentName: string
  content: string
  score: number
  pageNumber?: number
  highlightedContent: string
}

export interface Template {
  id: string
  name: string
  description: string
  fields: TemplateField[]
  createdAt: string
  updatedAt: string
  usageCount: number
}

export interface TemplateField {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'checkbox' | 'dropdown'
  required: boolean
  placeholder?: string
  options?: string[] // for dropdown fields
  validation?: {
    pattern?: string
    min?: number
    max?: number
  }
}

export interface FillJob {
  id: string
  templateId: string
  templateName: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
  resultUrl?: string
  errorMessage?: string
  fieldValues: Record<string, any>
}

export interface ApiError {
  message: string
  code?: string
  details?: Record<string, any>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export interface SearchFilters {
  documentTypes?: string[]
  dateRange?: {
    start: string
    end: string
  }
  tags?: string[]
}

export interface DocumentFilters {
  mimeType?: string[]
  isIndexed?: boolean
  embeddingStatus?: string[]
  search?: string
} 