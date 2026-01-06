// Document type metadata
export interface DocumentTypeInfo {
  type: string;
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

