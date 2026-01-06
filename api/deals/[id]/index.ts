import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../_lib/db';
import { UpdateDealSchema, parseBody } from '../../_lib/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Deal ID is required' });
  }

  try {
    if (req.method === 'GET') {
      return await getDeal(id, res);
    } else if (req.method === 'PUT') {
      return await updateDeal(id, req, res);
    } else if (req.method === 'DELETE') {
      return await deleteDeal(id, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}

async function getDeal(id: string, res: VercelResponse) {
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { uploadedAt: 'desc' },
      },
      analysisRuns: {
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      _count: {
        select: {
          documents: true,
          analysisRuns: true,
        },
      },
    },
  });

  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  return res.status(200).json({
    ...deal,
    requestedAmount: Number(deal.requestedAmount),
  });
}

async function updateDeal(id: string, req: VercelRequest, res: VercelResponse) {
  const data = parseBody(UpdateDealSchema, req.body);

  const deal = await prisma.deal.update({
    where: { id },
    data,
  });

  await prisma.activity.create({
    data: {
      dealId: id,
      type: 'DEAL_UPDATED',
      message: 'Deal information updated',
      metadata: data,
    },
  });

  return res.status(200).json({
    ...deal,
    requestedAmount: Number(deal.requestedAmount),
  });
}

async function deleteDeal(id: string, res: VercelResponse) {
  await prisma.deal.delete({
    where: { id },
  });

  return res.status(204).end();
}

