import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, RefreshCw, Briefcase } from 'lucide-react'
import DealCard from '../components/DealCard'
import CreateDealModal from '../components/CreateDealModal'
import { DealCardSkeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { getDeals } from '../lib/api'
import { cn } from '../lib/utils'
import type { Deal, DealStatus } from '../types'

export default function Dashboard() {
  const { error } = useToast()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<DealStatus | 'ALL'>('ALL')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const fetchDeals = async () => {
    try {
      const data = await getDeals()
      setDeals(data)
    } catch (err) {
      error('Failed to Load Deals', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeals()
  }, [])

  // Filter deals
  const filteredDeals = deals.filter(deal => {
    const matchesSearch =
      searchQuery === '' ||
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.borrowerName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || deal.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Group deals by status
  const groupedDeals = {
    ANALYZING: filteredDeals.filter(d => d.status === 'ANALYZING'),
    DRAFT: filteredDeals.filter(d => d.status === 'DRAFT'),
    READY: filteredDeals.filter(d => d.status === 'READY'),
    ANALYZED: filteredDeals.filter(d => d.status === 'ANALYZED'),
  }

  const statusCounts = {
    ALL: deals.length,
    DRAFT: deals.filter(d => d.status === 'DRAFT').length,
    READY: deals.filter(d => d.status === 'READY').length,
    ANALYZING: deals.filter(d => d.status === 'ANALYZING').length,
    ANALYZED: deals.filter(d => d.status === 'ANALYZED').length,
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-color)]">
        <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          {/* Title Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 lg:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Deals Dashboard</h1>
              <p className="text-sm text-[var(--text-secondary)] hidden sm:block">
                Manage your SBA underwriting applications
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="btn btn-primary w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Create Deal
            </button>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            {/* Search */}
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search deals..."
                className="input pl-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter - Scrollable on mobile */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 sm:gap-2 p-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] overflow-x-auto scrollbar-thin">
                {(['ALL', 'DRAFT', 'READY', 'ANALYZING', 'ANALYZED'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      'px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap',
                      statusFilter === status
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                    <span className="ml-1 text-xs opacity-70">
                      ({statusCounts[status]})
                    </span>
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <button
                onClick={fetchDeals}
                className="btn btn-ghost shrink-0"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <DealCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredDeals.length === 0 ? (
          <EmptyState
            hasDeals={deals.length > 0}
            onCreateDeal={() => setCreateModalOpen(true)}
          />
        ) : statusFilter === 'ALL' ? (
          <div className="space-y-6 lg:space-y-8">
            {/* Analyzing */}
            {groupedDeals.ANALYZING.length > 0 && (
              <DealSection
                title="Currently Analyzing"
                deals={groupedDeals.ANALYZING}
                color="text-amber-400"
              />
            )}

            {/* Ready for Analysis */}
            {groupedDeals.READY.length > 0 && (
              <DealSection
                title="Ready for Analysis"
                deals={groupedDeals.READY}
                color="text-blue-400"
              />
            )}

            {/* Draft */}
            {groupedDeals.DRAFT.length > 0 && (
              <DealSection
                title="Missing Documents"
                deals={groupedDeals.DRAFT}
                color="text-slate-400"
              />
            )}

            {/* Analyzed */}
            {groupedDeals.ANALYZED.length > 0 && (
              <DealSection
                title="Analysis Complete"
                deals={groupedDeals.ANALYZED}
                color="text-emerald-400"
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDeals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} index={index} />
            ))}
          </div>
        )}
      </main>

      {/* Create Deal Modal */}
      <CreateDealModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={fetchDeals}
      />
    </div>
  )
}

interface DealSectionProps {
  title: string
  deals: Deal[]
  color: string
}

function DealSection({ title, deals, color }: DealSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className={cn('text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2', color)}>
        <span className="w-2 h-2 rounded-full bg-current" />
        {title}
        <span className="text-[var(--text-muted)] font-normal">({deals.length})</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {deals.map((deal, index) => (
          <DealCard key={deal.id} deal={deal} index={index} />
        ))}
      </div>
    </motion.section>
  )
}

interface EmptyStateProps {
  hasDeals: boolean
  onCreateDeal: () => void
}

function EmptyState({ hasDeals, onCreateDeal }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 sm:py-20 px-4"
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4 sm:mb-6 border border-blue-500/20">
        <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
      </div>
      {hasDeals ? (
        <>
          <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-2 text-center">
            No matching deals
          </h3>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-6 text-center">
            Try adjusting your search or filter criteria
          </p>
        </>
      ) : (
        <>
          <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-2 text-center">
            No deals yet
          </h3>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-6 text-center">
            Create your first deal to get started with underwriting
          </p>
          <button onClick={onCreateDeal} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Create Your First Deal
          </button>
        </>
      )}
    </motion.div>
  )
}
