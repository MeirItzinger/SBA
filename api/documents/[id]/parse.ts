import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs/promises';
import prisma from '../../_lib/db';
import { parsePDFFromPath, parsePDFFromBuffer } from '../../_lib/pdf-parser';

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
    return res.status(400).json({ error: 'Document ID is required' });
  }

  try {
    // Get document
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if already parsing
    if (document.parseStatus === 'PARSING') {
      return res.status(409).json({ error: 'Document is already being parsed' });
    }

    // Update status to parsing
    await prisma.document.update({
      where: { id },
      data: { parseStatus: 'PARSING' },
    });

    try {
      let parsedData;

      // Check if it's a local file or blob URL
      if (document.storagePath.startsWith('http')) {
        // Fetch from blob storage
        console.log('Fetching PDF from blob:', document.storagePath);
        const response = await fetch(document.storagePath);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF from storage: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log('Fetched PDF, size:', arrayBuffer.byteLength, 'bytes');
        
        const buffer = Buffer.from(arrayBuffer);
        parsedData = await parsePDFFromBuffer(buffer);
      } else {
        // Read from local filesystem
        console.log('Reading PDF from local path:', document.storagePath);
        parsedData = await parsePDFFromPath(document.storagePath);
      }

      // Delete existing chunks
      await prisma.documentChunk.deleteMany({
        where: { documentId: id },
      });

      // Create new chunks
      await prisma.documentChunk.createMany({
        data: parsedData.chunks.map(chunk => ({
          documentId: id,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          pageHint: chunk.pageHint,
        })),
      });

      // Update document with parsed text and status
      const updatedDocument = await prisma.document.update({
        where: { id },
        data: {
          parseStatus: 'PARSED',
          parsedText: parsedData.text,
          parsedAt: new Date(),
          parseError: null,
        },
        include: {
          chunks: {
            orderBy: { chunkIndex: 'asc' },
          },
        },
      });

      // Create activity
      await prisma.activity.create({
        data: {
          dealId: document.dealId,
          type: 'DOCUMENT_PARSED',
          message: `${document.docType.replace(/_/g, ' ')} parsed successfully (${parsedData.numPages} pages)`,
          metadata: {
            documentId: id,
            numPages: parsedData.numPages,
            numChunks: parsedData.chunks.length,
            textLength: parsedData.text.length,
          },
        },
      });

      return res.status(200).json({
        ...updatedDocument,
        numPages: parsedData.numPages,
        numChunks: parsedData.chunks.length,
      });

    } catch (parseError) {
      console.error('Parse error:', parseError);
      
      const errorMessage = parseError instanceof Error ? parseError.message : 'Failed to parse document';

      // Update document with error
      await prisma.document.update({
        where: { id },
        data: {
          parseStatus: 'ERROR',
          parseError: errorMessage,
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

