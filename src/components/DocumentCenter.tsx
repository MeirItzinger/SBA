import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  Eye,
  RefreshCw,
  X,
  FileUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn, formatFileSize, formatDateTime, getStatusColor } from '../lib/utils'
import { useToast } from './Toast'
import { uploadDocument, deleteDocument, parseDocument, getDocument } from '../lib/api'
import { DOCUMENT_TYPES, type Document, type DocumentType } from '../types'

interface DocumentCenterProps {
  dealId: string
  documents: Document[]
  onDocumentsChange: () => void
}

export default function DocumentCenter({ dealId, documents, onDocumentsChange }: DocumentCenterProps) {
  const { success, error } = useToast()
  const [uploading, setUploading] = useState<string | null>(null)
  const [parsing, setParsing] = useState<Set<string>>(new Set())
  const [viewingText, setViewingText] = useState<{ doc: Document; text: string } | null>(null)

  // Calculate readiness
  const requiredDocs = DOCUMENT_TYPES.filter(d => d.required)
  const uploadedTypes = new Set(documents.map(d => d.docType))
  const uploadedRequired = requiredDocs.filter(d => uploadedTypes.has(d.type)).length
  const readinessPercent = Math.round((uploadedRequired / requiredDocs.length) * 100)

  const handleUpload = async (files: File[], docType: DocumentType) => {
    const file = files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      error('Invalid File', 'Only PDF files are allowed')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      error('File Too Large', 'Maximum file size is 20MB')
      return
    }

    setUploading(docType)
    try {
      const doc = await uploadDocument(dealId, file, docType)
      success('Document Uploaded', `${file.name} has been uploaded`)
      
      // Auto-parse after upload
      setParsing(prev => new Set(prev).add(doc.id))
      try {
        await parseDocument(doc.id)
      } catch (e) {
        console.warn('Auto-parse failed:', e)
      }
      setParsing(prev => {
        const next = new Set(prev)
        next.delete(doc.id)
        return next
      })

      onDocumentsChange()
    } catch (err) {
      error('Upload Failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setUploading(null)
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete ${doc.originalName}?`)) return

    try {
      await deleteDocument(doc.id)
      success('Document Deleted', `${doc.originalName} has been removed`)
      onDocumentsChange()
    } catch (err) {
      error('Delete Failed', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleParse = async (doc: Document) => {
    setParsing(prev => new Set(prev).add(doc.id))
    try {
      await parseDocument(doc.id)
      success('Parsing Complete', `${doc.originalName} has been parsed`)
      onDocumentsChange()
    } catch (err) {
      error('Parsing Failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setParsing(prev => {
        const next = new Set(prev)
        next.delete(doc.id)
        return next
      })
    }
  }

  const handleViewText = async (doc: Document) => {
    try {
      const fullDoc = await getDocument(doc.id)
      const text = fullDoc.parsedText || fullDoc.chunks?.map(c => c.text).join('\n\n') || 'No text extracted'
      setViewingText({ doc, text })
    } catch (err) {
      error('Failed to Load', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Readiness Meter */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Document Readiness</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {uploadedRequired} of {requiredDocs.length} required documents uploaded
            </p>
          </div>
          <span className={cn(
            'text-2xl font-bold',
            readinessPercent >= 100 ? 'text-emerald-400' : readinessPercent >= 50 ? 'text-amber-400' : 'text-red-400'
          )}>
            {readinessPercent}%
          </span>
        </div>
        <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full',
              readinessPercent >= 100 ? 'bg-emerald-500' : readinessPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${readinessPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Document Type Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DOCUMENT_TYPES.map(docType => {
          const uploaded = documents.filter(d => d.docType === docType.type)
          const hasDoc = uploaded.length > 0

          return (
            <DocumentTypeCard
              key={docType.type}
              docType={docType}
              documents={uploaded}
              uploading={uploading === docType.type}
              parsing={parsing}
              onUpload={(files) => handleUpload(files, docType.type)}
              onDelete={handleDelete}
              onParse={handleParse}
              onViewText={handleViewText}
            />
          )
        })}
      </div>

      {/* Text Viewer Drawer */}
      <AnimatePresence>
        {viewingText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setViewingText(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-[var(--bg-secondary)] border-l border-[var(--border-color)] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Extracted Text</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{viewingText.doc.originalName}</p>
                </div>
                <button
                  onClick={() => setViewingText(null)}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <pre className="whitespace-pre-wrap text-sm text-[var(--text-secondary)] font-mono leading-relaxed">
                  {viewingText.text}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface DocumentTypeCardProps {
  docType: (typeof DOCUMENT_TYPES)[number]
  documents: Document[]
  uploading: boolean
  parsing: Set<string>
  onUpload: (files: File[]) => void
  onDelete: (doc: Document) => void
  onParse: (doc: Document) => void
  onViewText: (doc: Document) => void
}

function DocumentTypeCard({
  docType,
  documents,
  uploading,
  parsing,
  onUpload,
  onDelete,
  onParse,
  onViewText,
}: DocumentTypeCardProps) {
  const [expanded, setExpanded] = useState(documents.length > 0)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
    disabled: uploading,
  })

  const hasDoc = documents.length > 0

  return (
    <div className={cn(
      'card overflow-hidden transition-all',
      isDragActive && 'border-blue-500 bg-blue-500/5'
    )}>
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            hasDoc ? 'bg-emerald-500/20' : 'bg-slate-500/20'
          )}>
            {hasDoc ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <FileText className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-[var(--text-primary)]">{docType.label}</h4>
              {docType.required && (
                <span className="text-[10px] text-red-400 font-medium uppercase">Required</span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">{docType.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasDoc && (
            <span className="badge badge-green text-xs">
              {documents.length} file{documents.length > 1 ? 's' : ''}
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 pt-2 space-y-3">
              {/* Existing Documents */}
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg"
                >
                  <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {doc.originalName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>{formatDateTime(doc.uploadedAt)}</span>
                      <span>•</span>
                      <span className={cn('badge text-xs', getStatusColor(doc.parseStatus))}>
                        {doc.parseStatus}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {doc.parseStatus === 'PARSED' && (
                      <button
                        onClick={() => onViewText(doc)}
                        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        title="View extracted text"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {(doc.parseStatus === 'PENDING' || doc.parseStatus === 'ERROR') && (
                      <button
                        onClick={() => onParse(doc)}
                        disabled={parsing.has(doc.id)}
                        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                        title="Parse document"
                      >
                        {parsing.has(doc.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(doc)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Upload Area */}
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all',
                  isDragActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-[var(--border-color)] hover:border-blue-500/50 hover:bg-[var(--bg-hover)]',
                  uploading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                ) : isDragActive ? (
                  <div className="flex items-center justify-center gap-2 text-blue-400">
                    <FileUp className="w-5 h-5" />
                    <span>Drop PDF here</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)]">
                    <Upload className="w-5 h-5" />
                    <span>
                      {hasDoc ? 'Upload another' : 'Upload'} PDF
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

