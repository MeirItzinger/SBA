import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return formatDate(date)
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'badge-gray'
    case 'READY':
      return 'badge-blue'
    case 'ANALYZING':
      return 'badge-yellow'
    case 'ANALYZED':
      return 'badge-green'
    case 'PENDING':
      return 'badge-gray'
    case 'PARSING':
      return 'badge-yellow'
    case 'PARSED':
      return 'badge-green'
    case 'ERROR':
      return 'badge-red'
    case 'SUCCESS':
      return 'badge-green'
    case 'FAILED':
      return 'badge-red'
    case 'RUNNING':
    case 'QUEUED':
      return 'badge-yellow'
    default:
      return 'badge-gray'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Missing Documents'
    case 'READY':
      return 'Ready for Analysis'
    case 'ANALYZING':
      return 'Analyzing...'
    case 'ANALYZED':
      return 'Analysis Complete'
    default:
      return status.replace(/_/g, ' ')
  }
}

export function getRecommendationColor(recommendation: string): string {
  switch (recommendation) {
    case 'Proceed':
      return 'badge-green'
    case 'Proceed with conditions':
      return 'badge-blue'
    case 'Hold - need more info':
      return 'badge-yellow'
    case 'Decline':
      return 'badge-red'
    default:
      return 'badge-gray'
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'low':
      return 'text-emerald-400'
    case 'medium':
      return 'text-amber-400'
    case 'high':
      return 'text-red-400'
    default:
      return 'text-slate-400'
  }
}

