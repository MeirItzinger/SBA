import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/db';
import { CreateDealSchema, parseBody } from '../_lib/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      return await listDeals(req, res);
    } else if (req.method === 'POST') {
      return await createDeal(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}

async function listDeals(_req: VercelRequest, res: VercelResponse) {
  const deals = await prisma.deal.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          documents: true,
          analysisRuns: true,
        },
      },
    },
  });

  // Convert Decimal to number for JSON serialization
  const serializedDeals = deals.map(deal => ({
    ...deal,
    requestedAmount: Number(deal.requestedAmount),
  }));

  return res.status(200).json(serializedDeals);
}

async function createDeal(req: VercelRequest, res: VercelResponse) {
  const data = parseBody(CreateDealSchema, req.body);

  const deal = await prisma.deal.create({
    data: {
      name: data.name,
      borrowerName: data.borrowerName,
      programType: data.programType,
      requestedAmount: data.requestedAmount,
      notes: data.notes,
      status: 'DRAFT',
    },
  });

  // Create initial activity
  await prisma.activity.create({
    data: {
      dealId: deal.id,
      type: 'DEAL_CREATED',
      message: `Deal "${deal.name}" created for ${deal.borrowerName}`,
      metadata: {
        requestedAmount: Number(deal.requestedAmount),
        programType: deal.programType,
      },
    },
  });

  return res.status(201).json({
    ...deal,
    requestedAmount: Number(deal.requestedAmount),
  });
}

