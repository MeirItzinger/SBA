import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../_lib/db';
import { runAnalysis, isOpenAIConfigured } from '../../_lib/openai-service';
import { DOCUMENT_TYPES } from '../../_lib/constants';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Deal ID is required' });
  }

  try {
    // Get deal with documents
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        documents: {
          include: {
            chunks: {
              orderBy: { chunkIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check if there's already a running analysis
    const existingRun = await prisma.analysisRun.findFirst({
      where: {
        dealId: id,
        status: { in: ['QUEUED', 'RUNNING'] },
      },
    });

    if (existingRun) {
      return res.status(409).json({ error: 'Analysis already in progress' });
    }

    // Create analysis run
    const analysisRun = await prisma.analysisRun.create({
      data: {
        dealId: id,
        status: 'RUNNING',
        modelName: isOpenAIConfigured() ? 'gpt-4o' : 'mock',
      },
    });

    // Update deal status
    await prisma.deal.update({
      where: { id },
      data: { status: 'ANALYZING' },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        dealId: id,
        type: 'ANALYSIS_STARTED',
        message: `Underwriting analysis started${!isOpenAIConfigured() ? ' (using mock data - no API key configured)' : ''}`,
        metadata: { analysisRunId: analysisRun.id },
      },
    });

    try {
      // Build deal context
      const requiredDocTypes = DOCUMENT_TYPES.filter(d => d.required).map(d => d.type);
      const uploadedDocTypes = new Set(deal.documents.map(d => d.docType));
      
      const documentsPresent = deal.documents.map(d => {
        const info = DOCUMENT_TYPES.find(dt => dt.type === d.docType);
        return info?.label || d.docType.replace(/_/g, ' ');
      });
      
      const documentsMissing = requiredDocTypes
        .filter(type => !uploadedDocTypes.has(type))
        .map(type => {
          const info = DOCUMENT_TYPES.find(dt => dt.type === type);
          return info?.label || type.replace(/_/g, ' ');
        });

      const dealContext = {
        borrowerName: deal.borrowerName,
        requestedAmount: Number(deal.requestedAmount),
        programType: deal.programType,
        documentsPresent,
        documentsMissing,
      };

      // Build document summaries
      const documentSummaries = deal.documents
        .filter(d => d.parseStatus === 'PARSED' && (d.parsedText || d.chunks.length > 0))
        .map(d => ({
          docType: d.docType,
          fileName: d.originalName,
          textContent: d.parsedText || d.chunks.map(c => c.text).join('\n\n'),
        }));

      // If no parsed documents, still run with empty summaries for mock
      if (documentSummaries.length === 0 && !isOpenAIConfigured()) {
        // Add placeholder summaries for mock
        deal.documents.forEach(d => {
          documentSummaries.push({
            docType: d.docType,
            fileName: d.originalName,
            textContent: '[Document pending parsing]',
          });
        });
      }

      // Run analysis
      const { output, tokensUsed } = await runAnalysis(dealContext, documentSummaries);

      // Update analysis run with results
      await prisma.analysisRun.update({
        where: { id: analysisRun.id },
        data: {
          status: 'SUCCESS',
          outputJson: output as any,
          tokensUsed,
          finishedAt: new Date(),
        },
      });

      // Update deal status
      await prisma.deal.update({
        where: { id },
        data: { status: 'ANALYZED' },
      });

      // Create activity
      await prisma.activity.create({
        data: {
          dealId: id,
          type: 'ANALYSIS_COMPLETED',
          message: `Analysis complete: ${output.recommendation}`,
          metadata: {
            analysisRunId: analysisRun.id,
            recommendation: output.recommendation,
            confidence: output.confidence,
          },
        },
      });

      return res.status(200).json({
        ...analysisRun,
        status: 'SUCCESS',
        outputJson: output,
        tokensUsed,
        finishedAt: new Date().toISOString(),
      });

    } catch (analysisError) {
      console.error('Analysis error:', analysisError);
      
      const errorMessage = analysisError instanceof Error ? analysisError.message : 'Analysis failed';

      // Update analysis run with error
      await prisma.analysisRun.update({
        where: { id: analysisRun.id },
        data: {
          status: 'FAILED',
          errorMessage,
          finishedAt: new Date(),
        },
      });

      // Revert deal status
      await prisma.deal.update({
        where: { id },
        data: { status: 'READY' },
      });

      // Create activity
      await prisma.activity.create({
        data: {
          dealId: id,
          type: 'ANALYSIS_FAILED',
          message: `Analysis failed: ${errorMessage}`,
          metadata: { analysisRunId: analysisRun.id, error: errorMessage },
        },
      });

      return res.status(500).json({ error: errorMessage });
    }

  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}

