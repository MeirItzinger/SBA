import { motion } from 'framer-motion'
import {
  FileText,
  Play,
  CheckCircle,
  XCircle,
  Upload,
  Trash2,
  RefreshCw,
  PlusCircle,
  Edit,
} from 'lucide-react'
import { cn, formatDateTime, formatRelativeTime } from '../lib/utils'
import type { Activity } from '../types'

interface TimelineProps {
  activities: Activity[]
}

export default function Timeline({ activities }: TimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[var(--text-muted)]">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-[var(--text-primary)] mb-6">Activity Timeline</h3>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border-color)]" />

        <div className="space-y-4">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pl-10"
            >
              {/* Icon */}
              <div className={cn(
                'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-[var(--bg-primary)]',
                getActivityIconBg(activity.type)
              )}>
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                <p className="text-sm text-[var(--text-primary)]">{activity.message}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1" title={formatDateTime(activity.createdAt)}>
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getActivityIcon(type: string) {
  const iconClass = 'w-4 h-4'
  
  switch (type) {
    case 'DEAL_CREATED':
      return <PlusCircle className={cn(iconClass, 'text-blue-400')} />
    case 'DEAL_UPDATED':
      return <Edit className={cn(iconClass, 'text-purple-400')} />
    case 'DOCUMENT_UPLOADED':
      return <Upload className={cn(iconClass, 'text-emerald-400')} />
    case 'DOCUMENT_DELETED':
      return <Trash2 className={cn(iconClass, 'text-red-400')} />
    case 'DOCUMENT_PARSED':
      return <RefreshCw className={cn(iconClass, 'text-blue-400')} />
    case 'ANALYSIS_STARTED':
      return <Play className={cn(iconClass, 'text-amber-400')} />
    case 'ANALYSIS_COMPLETED':
      return <CheckCircle className={cn(iconClass, 'text-emerald-400')} />
    case 'ANALYSIS_FAILED':
      return <XCircle className={cn(iconClass, 'text-red-400')} />
    default:
      return <FileText className={cn(iconClass, 'text-slate-400')} />
  }
}

function getActivityIconBg(type: string) {
  switch (type) {
    case 'DEAL_CREATED':
      return 'bg-blue-500/20'
    case 'DEAL_UPDATED':
      return 'bg-purple-500/20'
    case 'DOCUMENT_UPLOADED':
      return 'bg-emerald-500/20'
    case 'DOCUMENT_DELETED':
      return 'bg-red-500/20'
    case 'DOCUMENT_PARSED':
      return 'bg-blue-500/20'
    case 'ANALYSIS_STARTED':
      return 'bg-amber-500/20'
    case 'ANALYSIS_COMPLETED':
      return 'bg-emerald-500/20'
    case 'ANALYSIS_FAILED':
      return 'bg-red-500/20'
    default:
      return 'bg-slate-500/20'
  }
}

