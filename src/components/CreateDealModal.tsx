import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'
import { useToast } from './Toast'
import { createDeal } from '../lib/api'
import type { ProgramType, DealFormData } from '../types'

interface CreateDealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function CreateDealModal({ open, onOpenChange, onSuccess }: CreateDealModalProps) {
  const navigate = useNavigate()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<DealFormData>({
    name: '',
    borrowerName: '',
    programType: 'SBA_7A',
    requestedAmount: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const amount = parseFloat(formData.requestedAmount.replace(/[^0-9.]/g, ''))
    if (isNaN(amount) || amount <= 0) {
      error('Invalid Amount', 'Please enter a valid loan amount')
      return
    }

    setLoading(true)
    try {
      const deal = await createDeal({
        name: formData.name,
        borrowerName: formData.borrowerName,
        programType: formData.programType,
        requestedAmount: amount,
        notes: formData.notes || undefined,
      })

      success('Deal Created', `${deal.name} has been created successfully`)
      onOpenChange(false)
      setFormData({
        name: '',
        borrowerName: '',
        programType: 'SBA_7A',
        requestedAmount: '',
        notes: '',
      })
      
      if (onSuccess) {
        onSuccess()
      }

      // Navigate to deal detail
      navigate(`/deals/${deal.id}`)
    } catch (err) {
      error('Failed to Create Deal', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleAmountChange = (value: string) => {
    // Allow only numbers and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '')
    setFormData(prev => ({ ...prev, requestedAmount: cleaned }))
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Deal"
      description="Enter the deal details to start the underwriting process"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="label">Deal Name</label>
          <input
            id="name"
            type="text"
            className="input"
            placeholder="e.g., ABC Restaurant Expansion"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div>
          <label htmlFor="borrowerName" className="label">Borrower Name</label>
          <input
            id="borrowerName"
            type="text"
            className="input"
            placeholder="e.g., John Smith"
            value={formData.borrowerName}
            onChange={e => setFormData(prev => ({ ...prev, borrowerName: e.target.value }))}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="requestedAmount" className="label">Loan Amount ($)</label>
            <input
              id="requestedAmount"
              type="text"
              className="input"
              placeholder="500,000"
              value={formData.requestedAmount}
              onChange={e => handleAmountChange(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="programType" className="label">Program Type</label>
            <select
              id="programType"
              className="input"
              value={formData.programType}
              onChange={e => setFormData(prev => ({ ...prev, programType: e.target.value as ProgramType }))}
            >
              <option value="SBA_7A">SBA 7(a)</option>
              <option value="SBA_504">SBA 504</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="label">Notes (optional)</label>
          <textarea
            id="notes"
            className="input min-h-[100px] resize-none"
            placeholder="Any additional context about this deal..."
            value={formData.notes}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Deal'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

