import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import {
  ArrowLeft,
  FileText,
  BarChart3,
  Clock,
  Building2,
  DollarSign,
  Trash2,
  Loader2,
} from 'lucide-react'
import DocumentCenter from '../components/DocumentCenter'
import AnalysisPanel from '../components/AnalysisPanel'
import Timeline from '../components/Timeline'
import { Skeleton, DocumentCardSkeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { getDeal, deleteDeal } from '../lib/api'
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils'
import type { Deal, Document, AnalysisRun, Activity } from '../types'

interface FullDeal extends Deal {
  documents: Document[]
  analysisRuns: AnalysisRun[]
  activities: Activity[]
}

export default function DealDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error } = useToast()
  
  const [deal, setDeal] = useState<FullDeal | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState('documents')

  const fetchDeal = async () => {
    if (!id) return
    try {
      const data = await getDeal(id)
      setDeal(data)
    } catch (err) {
      error('Failed to Load Deal', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeal()
  }, [id])

  const handleDelete = async () => {
    if (!deal) return
    if (!confirm(`Are you sure you want to delete "${deal.name}"? This action cannot be undone.`)) return

    setDeleting(true)
    try {
      await deleteDeal(deal.id)
      success('Deal Deleted', `${deal.name} has been deleted`)
      navigate('/')
    } catch (err) {
      error('Delete Failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  if (!deal) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Deal Not Found</h2>
          <p className="text-[var(--text-secondary)] mb-4">The deal you're looking for doesn't exist.</p>
          <Link to="/" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const programLabel = deal.programType === 'SBA_7A' ? '7(a)' : deal.programType === 'SBA_504' ? '504' : 'Other'

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-color)]">
        <div className="px-8 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <Link to="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="text-[var(--text-primary)]">{deal.name}</span>
          </div>

          {/* Deal Info */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">{deal.name}</h1>
                <span className={cn('badge', getStatusColor(deal.status))}>
                  {getStatusLabel(deal.status)}
                </span>
              </div>
              <div className="flex items-center gap-6 text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {deal.borrowerName}
                </span>
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  {formatCurrency(deal.requestedAmount)}
                </span>
                <span>SBA {programLabel}</span>
                <span className="text-[var(--text-muted)]">
                  Created {formatDate(deal.createdAt)}
                </span>
              </div>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn btn-danger"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete Deal
            </button>
          </div>

          {/* Notes */}
          {deal.notes && (
            <p className="mt-4 text-sm text-[var(--text-secondary)] bg-[var(--bg-card)] px-4 py-3 rounded-lg border border-[var(--border-color)]">
              {deal.notes}
            </p>
          )}
        </div>
      </header>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="px-8">
            <Tabs.List className="flex gap-1">
              <TabTrigger value="documents" icon={<FileText className="w-4 h-4" />}>
                Document Center
                <span className="ml-1.5 text-xs opacity-70">({deal.documents.length})</span>
              </TabTrigger>
              <TabTrigger value="analysis" icon={<BarChart3 className="w-4 h-4" />}>
                Analysis
                <span className="ml-1.5 text-xs opacity-70">({deal.analysisRuns.length})</span>
              </TabTrigger>
              <TabTrigger value="timeline" icon={<Clock className="w-4 h-4" />}>
                Timeline
                <span className="ml-1.5 text-xs opacity-70">({deal.activities.length})</span>
              </TabTrigger>
            </Tabs.List>
          </div>
        </div>

        <main className="p-8">
          <Tabs.Content value="documents" asChild>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <DocumentCenter
                dealId={deal.id}
                documents={deal.documents}
                onDocumentsChange={fetchDeal}
              />
            </motion.div>
          </Tabs.Content>

          <Tabs.Content value="analysis" asChild>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AnalysisPanel
                dealId={deal.id}
                dealStatus={deal.status}
                documents={deal.documents}
                analysisRuns={deal.analysisRuns}
                onAnalysisComplete={fetchDeal}
              />
            </motion.div>
          </Tabs.Content>

          <Tabs.Content value="timeline" asChild>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Timeline activities={deal.activities} />
            </motion.div>
          </Tabs.Content>
        </main>
      </Tabs.Root>
    </div>
  )
}

interface TabTriggerProps {
  value: string
  icon: React.ReactNode
  children: React.ReactNode
}

function TabTrigger({ value, icon, children }: TabTriggerProps) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all',
        'data-[state=inactive]:border-transparent data-[state=inactive]:text-[var(--text-muted)]',
        'data-[state=active]:border-blue-500 data-[state=active]:text-blue-400',
        'hover:text-[var(--text-primary)]'
      )}
    >
      {icon}
      {children}
    </Tabs.Trigger>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-full">
      <header className="border-b border-[var(--border-color)]">
        <div className="px-8 py-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-8 w-64 mb-2" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </header>
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="px-8 py-3 flex gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <main className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <DocumentCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  )
}

