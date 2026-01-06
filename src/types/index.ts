// Enums matching Prisma schema
export type ProgramType = 'SBA_7A' | 'SBA_504' | 'OTHER';
export type DealStatus = 'DRAFT' | 'READY' | 'ANALYZING' | 'ANALYZED';
export type DocumentType =
  | 'BORROWER_INTAKE_SUMMARY'
  | 'PERSONAL_FINANCIAL_STATEMENT'
  | 'BUSINESS_FINANCIAL_STATEMENTS'
  | 'BUSINESS_TAX_RETURNS'
  | 'PERSONAL_TAX_RETURNS'
  | 'BUSINESS_DEBT_SCHEDULE'
  | 'AR_AP_AGING'
  | 'BANK_STATEMENTS'
  | 'BUSINESS_PLAN_EXEC_SUMMARY'
  | 'COLLATERAL_UCC_INSURANCE'
  | 'ENTITY_LEGAL_DOCS'
  | 'PROJECT_COSTS_QUOTES'
  | 'OTHER';
export type ParseStatus = 'PENDING' | 'PARSING' | 'PARSED' | 'ERROR';
export type AnalysisStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED';

// Document type metadata for UI
export interface DocumentTypeInfo {
  type: DocumentType;
  label: string;
  description: string;
  required: boolean;
}

export const DOCUMENT_TYPES: DocumentTypeInfo[] = [
  {
    type: 'BORROWER_INTAKE_SUMMARY',
    label: 'Borrower Intake Summary',
    description: 'Application intake form with borrower details',
    required: true,
  },
  {
    type: 'PERSONAL_FINANCIAL_STATEMENT',
    label: 'Personal Financial Statement',
    description: 'SBA Form 413 or equivalent',
    required: true,
  },
  {
    type: 'BUSINESS_FINANCIAL_STATEMENTS',
    label: 'Business Financial Statements',
    description: 'P&L, Balance Sheet, Cash Flow (3 years)',
    required: true,
  },
  {
    type: 'BUSINESS_TAX_RETURNS',
    label: 'Business Tax Returns',
    description: 'Last 3 years of business tax returns',
    required: true,
  },
  {
    type: 'PERSONAL_TAX_RETURNS',
    label: 'Personal Tax Returns',
    description: 'Last 3 years of personal tax returns for principals',
    required: true,
  },
  {
    type: 'BUSINESS_DEBT_SCHEDULE',
    label: 'Business Debt Schedule',
    description: 'Current debt obligations and payment schedule',
    required: true,
  },
  {
    type: 'AR_AP_AGING',
    label: 'AR/AP Aging Reports',
    description: 'Accounts receivable and payable aging',
    required: false,
  },
  {
    type: 'BANK_STATEMENTS',
    label: 'Bank Statements',
    description: 'Last 6-12 months of business bank statements',
    required: true,
  },
  {
    type: 'BUSINESS_PLAN_EXEC_SUMMARY',
    label: 'Business Plan / Executive Summary',
    description: 'Business overview and projections',
    required: false,
  },
  {
    type: 'COLLATERAL_UCC_INSURANCE',
    label: 'Collateral / UCC / Insurance',
    description: 'Collateral documentation, UCC filings, insurance policies',
    required: false,
  },
  {
    type: 'ENTITY_LEGAL_DOCS',
    label: 'Entity & Legal Documents',
    description: 'Articles of incorporation, operating agreements, etc.',
    required: false,
  },
  {
    type: 'PROJECT_COSTS_QUOTES',
    label: 'Project Costs & Quotes',
    description: 'Use of funds breakdown, contractor quotes',
    required: false,
  },
];

// API Response Types
export interface Deal {
  id: string;
  name: string;
  borrowerName: string;
  programType: ProgramType;
  requestedAmount: number;
  status: DealStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  documents?: Document[];
  _count?: {
    documents: number;
    analysisRuns: number;
  };
}

export interface Document {
  id: string;
  dealId: string;
  docType: DocumentType;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  parseStatus: ParseStatus;
  parsedText?: string;
  parseError?: string;
  uploadedAt: string;
  parsedAt?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  pageHint?: number;
}

export interface AnalysisRun {
  id: string;
  dealId: string;
  status: AnalysisStatus;
  modelName: string;
  outputJson?: AnalysisOutput;
  tokensUsed?: number;
  errorMessage?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface Activity {
  id: string;
  dealId: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Analysis Output Structure
export interface AnalysisOutput {
  recommendation: 'Proceed' | 'Proceed with conditions' | 'Hold - need more info' | 'Decline';
  confidence: number;
  decisionSummary: string;
  narrative: string[];
  highlights: Highlight[];
  strengths: StrengthItem[];
  risks: RiskItem[];
  openQuestions: OpenQuestion[];
  missingDocuments: MissingDocument[];
  conditions: Condition[];
}

export interface Highlight {
  label: string;
  value: string;
  doc?: string;
  pageHint?: number;
}

export interface StrengthItem {
  item: string;
  evidence: Evidence[];
}

export interface RiskItem {
  item: string;
  severity: 'low' | 'medium' | 'high';
  evidence: Evidence[];
}

export interface OpenQuestion {
  question: string;
  whyItMatters: string;
  bestDocToAnswer: string;
}

export interface MissingDocument {
  docType: string;
  whyNeeded: string;
}

export interface Condition {
  condition: string;
  rationale: string;
  evidence: Evidence[];
}

export interface Evidence {
  doc: string;
  pageHint?: number;
  quote?: string;
}

// API Request Types
export interface CreateDealRequest {
  name: string;
  borrowerName: string;
  programType: ProgramType;
  requestedAmount: number;
  notes?: string;
}

export interface UploadDocumentRequest {
  docType: DocumentType;
  file: File;
}

// Helper type for form handling
export interface DealFormData {
  name: string;
  borrowerName: string;
  programType: ProgramType;
  requestedAmount: string;
  notes: string;
}

