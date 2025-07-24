export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  role: 'USER' | 'ADMIN'
  createdAt: string
  lastLogin?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface Document {
  id: string
  userId: string
  googleFileId: string
  name: string
  mimeType: string
  filePath?: string
  fileSize: number
  googleModifiedTime: string
  processedAt?: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  chunksCount?: number
}

export interface SearchResult {
  id: string
  content: string
  score: number
  metadata: {
    documentId: string
    documentName: string
    chunkIndex: number
    tokenCount: number
  }
}

export interface PdfTemplate {
  id: string
  userId: string
  name: string
  description?: string
  filePath: string
  fieldMappings: Record<string, FieldMapping>
  llmPrompts: Record<string, string>
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface FieldMapping {
  type: 'text' | 'checkbox' | 'dropdown'
  label: string
  description?: string
  required?: boolean
  options?: string[]
  llmPrompt?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface ApiError {
  message: string
  statusCode: number
  timestamp: string
  path: string
} 