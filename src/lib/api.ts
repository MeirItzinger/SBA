import type { Deal, Document, AnalysisRun, CreateDealRequest, DocumentType } from '../types'

const API_BASE = '/api'

class ApiError extends Error {
  status: number
  
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new ApiError(error.error || 'Request failed', response.status)
  }

  if (response.status === 204) {
    return null as T
  }

  return response.json()
}

// Deals API
export async function getDeals(): Promise<Deal[]> {
  return request('/deals')
}

export async function getDeal(id: string): Promise<Deal & { documents: Document[], analysisRuns: AnalysisRun[], activities: any[] }> {
  return request(`/deals/${id}`)
}

export async function createDeal(data: CreateDealRequest): Promise<Deal> {
  return request('/deals', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateDeal(id: string, data: Partial<CreateDealRequest>): Promise<Deal> {
  return request(`/deals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteDeal(id: string): Promise<void> {
  return request(`/deals/${id}`, {
    method: 'DELETE',
  })
}

// Documents API
export async function getDocuments(dealId: string): Promise<Document[]> {
  return request(`/deals/${dealId}/documents`)
}

export async function uploadDocument(
  dealId: string,
  file: File,
  docType: DocumentType
): Promise<Document> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('docType', docType)

  const response = await fetch(`${API_BASE}/deals/${dealId}/documents`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new ApiError(error.error || 'Upload failed', response.status)
  }

  return response.json()
}

export async function deleteDocument(documentId: string): Promise<void> {
  return request(`/documents/${documentId}`, {
    method: 'DELETE',
  })
}

export async function parseDocument(documentId: string): Promise<Document> {
  return request(`/documents/${documentId}/parse`, {
    method: 'POST',
  })
}

export async function getDocument(documentId: string): Promise<Document & { chunks: any[] }> {
  return request(`/documents/${documentId}`)
}

// Analysis API
export async function runAnalysis(dealId: string): Promise<AnalysisRun> {
  return request(`/deals/${dealId}/analyze`, {
    method: 'POST',
  })
}

export { ApiError }

