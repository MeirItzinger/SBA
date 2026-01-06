import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Loader2,
  Download,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  FileWarning,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { cn, getRecommendationColor, getSeverityColor, formatDateTime } from '../lib/utils'
import { useToast } from './Toast'
import { runAnalysis } from '../lib/api'
import { DOCUMENT_TYPES, type AnalysisRun, type AnalysisOutput, type Document } from '../types'

interface AnalysisPanelProps {
  dealId: string
  dealStatus: string
  documents: Document[]
  analysisRuns: AnalysisRun[]
  onAnalysisComplete: () => void
}

export default function AnalysisPanel({
  dealId,
  dealStatus,
  documents,
  analysisRuns,
  onAnalysisComplete,
}: AnalysisPanelProps) {
  const { success, error, warning } = useToast()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<string>('')

  const latestAnalysis = analysisRuns.find(r => r.status === 'SUCCESS')
  const isAnalyzing = dealStatus === 'ANALYZING'

  // Check readiness
  const requiredDocs = DOCUMENT_TYPES.filter(d => d.required).map(d => d.type)
  const uploadedTypes = new Set(documents.map(d => d.docType))
  const missingRequired = requiredDocs.filter(t => !uploadedTypes.has(t))
  const parsedCount = documents.filter(d => d.parseStatus === 'PARSED').length

  const canRunAnalysis = documents.length > 0 && !isAnalyzing && !running

  const handleRunAnalysis = async () => {
    if (missingRequired.length > 0) {
      warning(
        'Missing Required Documents',
        `${missingRequired.length} required documents are missing. Analysis may be limited.`
      )
    }

    if (parsedCount === 0 && documents.length > 0) {
      warning('No Parsed Documents', 'Documents have not been parsed yet. Results may be limited.')
    }

    setRunning(true)
    setProgress('Preparing analysis...')

    try {
      setProgress('Analyzing documents...')
      const result = await runAnalysis(dealId)
      
      if (result.status === 'SUCCESS') {
        success('Analysis Complete', `Recommendation: ${result.outputJson?.recommendation}`)
      }
      
      onAnalysisComplete()
    } catch (err) {
      error('Analysis Failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRunning(false)
      setProgress('')
    }
  }

  const handleExport = () => {
    if (!latestAnalysis?.outputJson) return

    const blob = new Blob([JSON.stringify(latestAnalysis.outputJson, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analysis-${dealId}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    success('Exported', 'Analysis JSON downloaded')
  }

  return (
    <div className="space-y-6">
      {/* Run Analysis Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Run Underwriting Analysis</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {documents.length} documents uploaded • {parsedCount} parsed
            </p>
          </div>
          <div className="flex items-center gap-3">
            {latestAnalysis && (
              <button
                onClick={handleExport}
                className="btn btn-secondary"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
            )}
            <button
              onClick={handleRunAnalysis}
              disabled={!canRunAnalysis}
              className="btn btn-primary"
            >
              {running || isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {progress || 'Analyzing...'}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Analysis
                </>
              )}
            </button>
          </div>
        </div>

        {/* Warnings */}
        {missingRequired.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-400">Missing Required Documents</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {missingRequired.map(t => DOCUMENT_TYPES.find(d => d.type === t)?.label).join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {latestAnalysis?.outputJson && (
        <AnalysisResults
          analysis={latestAnalysis.outputJson}
          timestamp={latestAnalysis.finishedAt || latestAnalysis.startedAt}
          modelName={latestAnalysis.modelName}
        />
      )}

      {/* Analysis History */}
      {analysisRuns.length > 1 && (
        <div className="card p-6">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Analysis History</h3>
          <div className="space-y-2">
            {analysisRuns.slice(1).map(run => (
              <div
                key={run.id}
                className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'badge',
                    run.status === 'SUCCESS' ? 'badge-green' : run.status === 'FAILED' ? 'badge-red' : 'badge-yellow'
                  )}>
                    {run.status}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {formatDateTime(run.startedAt)}
                  </span>
                </div>
                {run.outputJson && (
                  <span className="text-sm text-[var(--text-muted)]">
                    {(run.outputJson as AnalysisOutput).recommendation}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface AnalysisResultsProps {
  analysis: AnalysisOutput
  timestamp: string
  modelName: string
}

function AnalysisResults({ analysis, timestamp, modelName }: AnalysisResultsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['highlights', 'narrative', 'strengths', 'risks'])
  )

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Recommendation Header */}
      <div className="card overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 border-b border-[var(--border-color)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)] mb-1">Recommendation</p>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                {analysis.recommendation}
              </h2>
              <p className="mt-2 text-[var(--text-secondary)]">
                {analysis.decisionSummary}
              </p>
            </div>
            <div className="text-right">
              <div className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold',
                getRecommendationColor(analysis.recommendation)
              )}>
                <ShieldCheck className="w-5 h-5" />
                {Math.round(analysis.confidence * 100)}% Confidence
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {modelName} • {formatDateTime(timestamp)}
              </p>
            </div>
          </div>
        </div>

        {/* Highlights Grid */}
        <div className="p-6">
          <SectionHeader
            title="Key Highlights"
            icon={<TrendingUp className="w-5 h-5" />}
            expanded={expandedSections.has('highlights')}
            onToggle={() => toggleSection('highlights')}
          />
          <AnimatePresence>
            {expandedSections.has('highlights') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {analysis.highlights.map((highlight, i) => (
                    <div
                      key={i}
                      className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]"
                    >
                      <p className="text-xs text-[var(--text-muted)] mb-1">{highlight.label}</p>
                      <p className="font-semibold text-[var(--text-primary)]">{highlight.value}</p>
                      {highlight.doc && (
                        <EvidencePill doc={highlight.doc} pageHint={highlight.pageHint} />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Narrative */}
      <div className="card p-6">
        <SectionHeader
          title="Analysis Narrative"
          icon={<FileText className="w-5 h-5" />}
          expanded={expandedSections.has('narrative')}
          onToggle={() => toggleSection('narrative')}
        />
        <AnimatePresence>
          {expandedSections.has('narrative') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4">
                {analysis.narrative.map((paragraph, i) => (
                  <p key={i} className="text-[var(--text-secondary)] leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="card p-6">
          <SectionHeader
            title="Strengths"
            icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
            expanded={expandedSections.has('strengths')}
            onToggle={() => toggleSection('strengths')}
            badge={analysis.strengths.length}
            badgeColor="badge-green"
          />
          <AnimatePresence>
            {expandedSections.has('strengths') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-3">
                  {analysis.strengths.map((strength, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[var(--text-primary)]">{strength.item}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {strength.evidence.map((ev, j) => (
                            <EvidencePill key={j} doc={ev.doc} pageHint={ev.pageHint} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Risks */}
        <div className="card p-6">
          <SectionHeader
            title="Risks"
            icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
            expanded={expandedSections.has('risks')}
            onToggle={() => toggleSection('risks')}
            badge={analysis.risks.length}
            badgeColor="badge-yellow"
          />
          <AnimatePresence>
            {expandedSections.has('risks') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-3">
                  {analysis.risks.map((risk, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', getSeverityColor(risk.severity))} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[var(--text-primary)]">{risk.item}</p>
                          <span className={cn(
                            'text-xs font-medium uppercase',
                            getSeverityColor(risk.severity)
                          )}>
                            {risk.severity}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {risk.evidence.map((ev, j) => (
                            <EvidencePill key={j} doc={ev.doc} pageHint={ev.pageHint} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Open Questions */}
      {analysis.openQuestions.length > 0 && (
        <div className="card p-6">
          <SectionHeader
            title="Open Questions"
            icon={<HelpCircle className="w-5 h-5 text-blue-400" />}
            expanded={expandedSections.has('questions')}
            onToggle={() => toggleSection('questions')}
            badge={analysis.openQuestions.length}
            badgeColor="badge-blue"
          />
          <AnimatePresence>
            {expandedSections.has('questions') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-3">
                  {analysis.openQuestions.map((q, i) => (
                    <div key={i} className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                      <p className="font-medium text-[var(--text-primary)]">{q.question}</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">{q.whyItMatters}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-2">
                        Best document: {q.bestDocToAnswer}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Missing Documents */}
      {analysis.missingDocuments.length > 0 && (
        <div className="card p-6">
          <SectionHeader
            title="Missing Documents"
            icon={<FileWarning className="w-5 h-5 text-red-400" />}
            expanded={expandedSections.has('missing')}
            onToggle={() => toggleSection('missing')}
            badge={analysis.missingDocuments.length}
            badgeColor="badge-red"
          />
          <AnimatePresence>
            {expandedSections.has('missing') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-2">
                  {analysis.missingDocuments.map((doc, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <FileWarning className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{doc.docType}</p>
                        <p className="text-sm text-[var(--text-secondary)]">{doc.whyNeeded}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Conditions */}
      {analysis.conditions.length > 0 && (
        <div className="card p-6">
          <SectionHeader
            title="Conditions"
            icon={<AlertCircle className="w-5 h-5 text-purple-400" />}
            expanded={expandedSections.has('conditions')}
            onToggle={() => toggleSection('conditions')}
            badge={analysis.conditions.length}
            badgeColor="badge-purple"
          />
          <AnimatePresence>
            {expandedSections.has('conditions') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-3">
                  {analysis.conditions.map((condition, i) => (
                    <div key={i} className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <p className="font-medium text-[var(--text-primary)]">{condition.condition}</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">{condition.rationale}</p>
                      {condition.evidence.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {condition.evidence.map((ev, j) => (
                            <EvidencePill key={j} doc={ev.doc} pageHint={ev.pageHint} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

interface SectionHeaderProps {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  badge?: number
  badgeColor?: string
}

function SectionHeader({ title, icon, expanded, onToggle, badge, badgeColor }: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between group"
    >
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
        {badge !== undefined && (
          <span className={cn('badge', badgeColor || 'badge-gray')}>{badge}</span>
        )}
      </div>
      {expanded ? (
        <ChevronDown className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
      ) : (
        <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
      )}
    </button>
  )
}

function EvidencePill({ doc, pageHint }: { doc: string; pageHint?: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
      <FileText className="w-3 h-3" />
      {doc}
      {pageHint && <span className="text-blue-300">p.{pageHint}</span>}
    </span>
  )
}

