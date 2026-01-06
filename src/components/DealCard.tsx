import { Link } from 'react-router-dom'
import { FileText, ArrowRight, Building2, DollarSign, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils'
import type { Deal } from '../types'

interface DealCardProps {
  deal: Deal
  index?: number
}

export default function DealCard({ deal, index = 0 }: DealCardProps) {
  const statusColor = getStatusColor(deal.status)
  const statusLabel = getStatusLabel(deal.status)

  const programLabel = deal.programType === 'SBA_7A' ? '7(a)' : deal.programType === 'SBA_504' ? '504' : 'Other'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/deals/${deal.id}`}
        className="card-hover block p-5 group"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/20">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-blue-400 transition-colors">
                {deal.name}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {deal.borrowerName}
              </p>
            </div>
          </div>
          <span className={cn('badge', statusColor)}>
            {statusLabel}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-0.5 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Loan Amount
            </p>
            <p className="font-semibold text-[var(--text-primary)]">
              {formatCurrency(deal.requestedAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-0.5">Program</p>
            <p className="font-semibold text-[var(--text-primary)]">
              SBA {programLabel}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Created
            </p>
            <p className="font-semibold text-[var(--text-primary)]">
              {formatDate(deal.createdAt)}
            </p>
          </div>
        </div>

        {deal._count && (
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
              <span>{deal._count.documents} documents</span>
              <span>{deal._count.analysisRuns} analysis runs</span>
            </div>
            <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-sm font-medium">
              Open <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        )}
      </Link>
    </motion.div>
  )
}

