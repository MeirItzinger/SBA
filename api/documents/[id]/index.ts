import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../_lib/db';
import { getStorage } from '../../_lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  try {
    if (req.method === 'GET') {
      return await getDocument(id, res);
    } else if (req.method === 'DELETE') {
      return await deleteDocument(id, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}

async function getDocument(id: string, res: VercelResponse) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      chunks: {
        orderBy: { chunkIndex: 'asc' },
      },
    },
  });

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  return res.status(200).json(document);
}

async function deleteDocument(id: string, res: VercelResponse) {
  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Delete file from storage
  const storage = getStorage();
  await storage.delete(document.storagePath);

  // Delete document (cascades to chunks)
  await prisma.document.delete({
    where: { id },
  });

  // Create activity
  await prisma.activity.create({
    data: {
      dealId: document.dealId,
      type: 'DOCUMENT_DELETED',
      message: `${document.docType.replace(/_/g, ' ')} deleted: ${document.originalName}`,
      metadata: {
        docType: document.docType,
        fileName: document.originalName,
      },
    },
  });

  return res.status(204).end();
}

