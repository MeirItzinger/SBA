import OpenAI from 'openai';

interface DealContext {
  borrowerName: string;
  requestedAmount: number;
  programType: string;
  documentsPresent: string[];
  documentsMissing: string[];
}

interface DocumentSummary {
  docType: string;
  fileName: string;
  textContent: string;
}

export interface AnalysisOutput {
  recommendation: 'Proceed' | 'Proceed with conditions' | 'Hold - need more info' | 'Decline';
  confidence: number;
  decisionSummary: string;
  narrative: string[];
  highlights: Array<{
    label: string;
    value: string;
    doc?: string;
    pageHint?: number;
  }>;
  strengths: Array<{
    item: string;
    evidence: Array<{ doc: string; pageHint?: number }>;
  }>;
  risks: Array<{
    item: string;
    severity: 'low' | 'medium' | 'high';
    evidence: Array<{ doc: string; pageHint?: number }>;
  }>;
  openQuestions: Array<{
    question: string;
    whyItMatters: string;
    bestDocToAnswer: string;
  }>;
  missingDocuments: Array<{
    docType: string;
    whyNeeded: string;
  }>;
  conditions: Array<{
    condition: string;
    rationale: string;
    evidence: Array<{ doc: string; pageHint?: number }>;
  }>;
}

const SYSTEM_PROMPT = `You are an expert SBA loan underwriter analyzing deal documentation. Your task is to provide a comprehensive underwriting analysis based on the documents provided.

IMPORTANT: Never use the word "verdict" in your response. Use "Recommendation", "Decision Summary", or "Outcome" instead.

Analyze the documents and provide:
1. Key financial metrics and facts
2. Strengths and positive indicators
3. Risks and concerns with severity levels
4. Open questions that need answers
5. Missing documents checklist
6. Clear recommendation with supporting narrative

Be thorough but fair. Consider:
- Revenue trends and stability
- EBITDA and cash flow adequacy
- Debt service coverage ratio (DSCR)
- Liquidity position
- Leverage levels
- Accounts receivable aging flags
- Collateral sufficiency
- Management experience

Provide evidence citations for every major point, referencing the specific document.`;

const OUTPUT_FORMAT_PROMPT = `Respond with a valid JSON object matching this exact structure:
{
  "recommendation": "Proceed" | "Proceed with conditions" | "Hold - need more info" | "Decline",
  "confidence": 0.0 to 1.0,
  "decisionSummary": "1-2 sentence summary of the recommendation",
  "narrative": ["paragraph1", "paragraph2", "paragraph3"],
  "highlights": [{"label": "Revenue", "value": "$2.5M", "doc": "Business Financial Statements", "pageHint": 1}],
  "strengths": [{"item": "Strong revenue growth of 21% YoY", "evidence": [{"doc": "Business Financial Statements", "pageHint": 1}]}],
  "risks": [{"item": "High customer concentration", "severity": "medium", "evidence": [{"doc": "AR/AP Aging Reports"}]}],
  "openQuestions": [{"question": "What is the reason for the large receivable?", "whyItMatters": "Could indicate collection issues", "bestDocToAnswer": "Bank Statements"}],
  "missingDocuments": [{"docType": "Personal Tax Returns", "whyNeeded": "Required to verify personal income of guarantors"}],
  "conditions": [{"condition": "Obtain personal guarantees from all 20%+ owners", "rationale": "Standard SBA requirement", "evidence": []}]
}`;

export async function runAnalysis(
  dealContext: DealContext,
  documentSummaries: DocumentSummary[]
): Promise<{ output: AnalysisOutput; tokensUsed: number }> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log('No OpenAI API key found, using mock response');
    return {
      output: generateMockAnalysis(dealContext, documentSummaries),
      tokensUsed: 0,
    };
  }

  const openai = new OpenAI({ apiKey });

  // Build the user prompt with deal context and documents
  const userPrompt = buildUserPrompt(dealContext, documentSummaries);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
        { role: 'user', content: OUTPUT_FORMAT_PROMPT },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    const output = JSON.parse(content) as AnalysisOutput;
    const tokensUsed = response.usage?.total_tokens || 0;

    return { output, tokensUsed };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function buildUserPrompt(dealContext: DealContext, documentSummaries: DocumentSummary[]): string {
  let prompt = `## Deal Overview
- Borrower: ${dealContext.borrowerName}
- Requested Amount: $${dealContext.requestedAmount.toLocaleString()}
- Program: ${dealContext.programType.replace('_', ' ')}

## Documents Present
${dealContext.documentsPresent.length > 0 ? dealContext.documentsPresent.map(d => `- ${d}`).join('\n') : '- None'}

## Documents Missing
${dealContext.documentsMissing.length > 0 ? dealContext.documentsMissing.map(d => `- ${d}`).join('\n') : '- None (all required documents present)'}

## Document Contents
`;

  for (const doc of documentSummaries) {
    prompt += `\n### ${doc.docType} (${doc.fileName})
${doc.textContent.substring(0, 8000)}
${doc.textContent.length > 8000 ? '\n[Content truncated...]' : ''}
`;
  }

  prompt += `\n\nBased on the above documentation, provide a comprehensive underwriting analysis.`;

  return prompt;
}

function generateMockAnalysis(
  dealContext: DealContext,
  documentSummaries: DocumentSummary[]
): AnalysisOutput {
  const hasFinancials = documentSummaries.some(d => 
    d.docType === 'BUSINESS_FINANCIAL_STATEMENTS'
  );
  const hasTaxReturns = documentSummaries.some(d => 
    d.docType === 'BUSINESS_TAX_RETURNS' || d.docType === 'PERSONAL_TAX_RETURNS'
  );
  const hasBankStatements = documentSummaries.some(d => 
    d.docType === 'BANK_STATEMENTS'
  );

  const docCount = documentSummaries.length;
  const missingCount = dealContext.documentsMissing.length;

  // Determine recommendation based on document completeness
  let recommendation: AnalysisOutput['recommendation'];
  let confidence: number;
  let decisionSummary: string;

  if (docCount >= 8 && missingCount <= 2) {
    recommendation = 'Proceed with conditions';
    confidence = 0.78;
    decisionSummary = `${dealContext.borrowerName} demonstrates adequate financial capacity for the requested ${dealContext.programType.replace('_', ' ')} loan. Minor conditions apply.`;
  } else if (docCount >= 5) {
    recommendation = 'Hold - need more info';
    confidence = 0.55;
    decisionSummary = `Additional documentation needed to complete the underwriting analysis for ${dealContext.borrowerName}.`;
  } else {
    recommendation = 'Hold - need more info';
    confidence = 0.35;
    decisionSummary = `Insufficient documentation to make a lending recommendation. Key financial documents are missing.`;
  }

  const narrative: string[] = [
    `This analysis evaluates ${dealContext.borrowerName}'s application for a $${dealContext.requestedAmount.toLocaleString()} ${dealContext.programType.replace('_', ' ')} loan. Based on the ${docCount} documents provided, we have conducted a preliminary assessment of the borrower's financial position and ability to service the proposed debt.`,
    
    hasFinancials
      ? `The business financial statements indicate stable operations with revenue trends that support the requested loan amount. Cash flow appears adequate to support debt service, though a detailed DSCR calculation requires verification against bank statements and tax returns.`
      : `Key financial statements were not provided, limiting our ability to assess the borrower's true financial position. We recommend obtaining complete financial statements before proceeding.`,
    
    hasBankStatements
      ? `Bank statement analysis shows consistent deposit activity and adequate average balances. No concerning patterns of overdrafts or returned items were identified in the provided statements.`
      : `Bank statements were not available for review. These are critical for verifying stated revenues and assessing cash flow patterns.`,
    
    missingCount > 0
      ? `To complete this underwriting, we require ${missingCount} additional document(s) as detailed in the missing documents section below. These items are necessary to satisfy SBA documentation requirements and complete our risk assessment.`
      : `All required documentation has been provided, enabling a comprehensive review of this application.`,
  ];

  const highlights = [
    { label: 'Requested Amount', value: `$${dealContext.requestedAmount.toLocaleString()}`, doc: 'Application' },
    { label: 'Program Type', value: dealContext.programType.replace('_', ' '), doc: 'Application' },
    { label: 'Documents Received', value: `${docCount} of ${docCount + missingCount}`, doc: 'Document Center' },
    { label: 'Est. DSCR', value: hasFinancials ? '1.35x' : 'N/A - Pending Docs', doc: 'Business Financial Statements', pageHint: 2 },
    { label: 'Revenue (Latest Year)', value: hasFinancials ? '$2,450,000' : 'Pending', doc: 'Business Financial Statements', pageHint: 1 },
    { label: 'Liquidity Ratio', value: hasFinancials ? '1.8x' : 'Pending', doc: 'Business Financial Statements', pageHint: 3 },
  ];

  const strengths = [
    { item: 'Established business with operating history', evidence: [{ doc: 'Borrower Intake Summary', pageHint: 1 }] },
    ...(hasFinancials ? [{ item: 'Positive revenue trend over past 3 years', evidence: [{ doc: 'Business Financial Statements', pageHint: 1 }] }] : []),
    ...(hasTaxReturns ? [{ item: 'Consistent tax filings demonstrate business stability', evidence: [{ doc: 'Business Tax Returns', pageHint: 1 }] }] : []),
    ...(hasBankStatements ? [{ item: 'Healthy bank balances and deposit activity', evidence: [{ doc: 'Bank Statements', pageHint: 1 }] }] : []),
  ];

  const risks: AnalysisOutput['risks'] = [
    { item: 'Documentation gaps may mask financial issues', severity: missingCount > 3 ? 'high' : 'medium', evidence: [{ doc: 'Document Center' }] },
    { item: 'Customer concentration risk not fully assessed', severity: 'medium', evidence: [{ doc: 'AR/AP Aging Reports' }] },
    { item: 'Collateral valuation pending verification', severity: 'low', evidence: [{ doc: 'Collateral/UCC/Insurance' }] },
  ];

  const openQuestions = [
    { question: 'What is the breakdown of major customers by revenue?', whyItMatters: 'Concentration risk affects loan security', bestDocToAnswer: 'AR/AP Aging Reports' },
    { question: 'Are there any pending legal actions or tax liens?', whyItMatters: 'Could affect collateral position', bestDocToAnswer: 'Entity Legal Documents' },
    { question: 'What is the use of funds breakdown?', whyItMatters: 'Ensures loan proceeds align with SBA requirements', bestDocToAnswer: 'Project Costs & Quotes' },
  ];

  const missingDocuments = dealContext.documentsMissing.map(docType => ({
    docType: docType.replace(/_/g, ' '),
    whyNeeded: getMissingDocReason(docType),
  }));

  const conditions = [
    { condition: 'Obtain personal guarantees from all owners with 20%+ equity', rationale: 'Standard SBA requirement for principals', evidence: [] },
    { condition: 'Verify no outstanding tax liens via IRS Form 4506-C', rationale: 'Ensures clear title to collateral', evidence: [] },
    { condition: 'Confirm business insurance meets SBA requirements', rationale: 'Collateral protection', evidence: [{ doc: 'Collateral/UCC/Insurance' }] },
  ];

  return {
    recommendation,
    confidence,
    decisionSummary,
    narrative,
    highlights,
    strengths,
    risks,
    openQuestions,
    missingDocuments,
    conditions,
  };
}

function getMissingDocReason(docType: string): string {
  const reasons: Record<string, string> = {
    BORROWER_INTAKE_SUMMARY: 'Required to understand loan purpose and borrower background',
    PERSONAL_FINANCIAL_STATEMENT: 'SBA requires PFS for all guarantors to assess personal liquidity',
    BUSINESS_FINANCIAL_STATEMENTS: 'Critical for DSCR calculation and financial health assessment',
    BUSINESS_TAX_RETURNS: 'Required to verify reported income and identify any discrepancies',
    PERSONAL_TAX_RETURNS: 'Needed to verify guarantor income and calculate global cash flow',
    BUSINESS_DEBT_SCHEDULE: 'Required to calculate total debt obligations and DSCR',
    AR_AP_AGING: 'Important for assessing working capital and collection patterns',
    BANK_STATEMENTS: 'Required to verify cash flow and identify any concerning patterns',
    BUSINESS_PLAN_EXEC_SUMMARY: 'Helpful for understanding business model and projections',
    COLLATERAL_UCC_INSURANCE: 'Needed to perfect security interest and verify coverage',
    ENTITY_LEGAL_DOCS: 'Required to verify ownership structure and signing authority',
    PROJECT_COSTS_QUOTES: 'Needed to verify use of proceeds and project feasibility',
  };
  return reasons[docType] || 'Required for complete underwriting analysis';
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

