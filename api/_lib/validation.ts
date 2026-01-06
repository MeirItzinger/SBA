import { z } from 'zod';

// Enum schemas
export const ProgramTypeSchema = z.enum(['SBA_7A', 'SBA_504', 'OTHER']);
export const DocumentTypeSchema = z.enum([
  'BORROWER_INTAKE_SUMMARY',
  'PERSONAL_FINANCIAL_STATEMENT',
  'BUSINESS_FINANCIAL_STATEMENTS',
  'BUSINESS_TAX_RETURNS',
  'PERSONAL_TAX_RETURNS',
  'BUSINESS_DEBT_SCHEDULE',
  'AR_AP_AGING',
  'BANK_STATEMENTS',
  'BUSINESS_PLAN_EXEC_SUMMARY',
  'COLLATERAL_UCC_INSURANCE',
  'ENTITY_LEGAL_DOCS',
  'PROJECT_COSTS_QUOTES',
  'OTHER',
]);

// Create Deal validation
export const CreateDealSchema = z.object({
  name: z.string().min(1, 'Deal name is required').max(255),
  borrowerName: z.string().min(1, 'Borrower name is required').max(255),
  programType: ProgramTypeSchema.default('SBA_7A'),
  requestedAmount: z.number().positive('Loan amount must be positive').max(50000000, 'Maximum loan amount exceeded'),
  notes: z.string().max(5000).optional(),
});

// Update Deal validation
export const UpdateDealSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  borrowerName: z.string().min(1).max(255).optional(),
  programType: ProgramTypeSchema.optional(),
  requestedAmount: z.number().positive().max(50000000).optional(),
  notes: z.string().max(5000).optional(),
});

// Document upload validation
export const UploadDocumentSchema = z.object({
  docType: DocumentTypeSchema,
});

// File validation constants
export const ALLOWED_MIME_TYPES = ['application/pdf'];
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function validateFile(file: { mimetype?: string; size?: number; type?: string }) {
  const mimeType = file.mimetype || file.type;
  const size = file.size;

  if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error('Only PDF files are allowed');
  }

  if (size && size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }

  return true;
}

// Helper to parse and validate request body
export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }
  return result.data;
}

