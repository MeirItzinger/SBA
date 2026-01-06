import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../_lib/db';
import { getStorage, generateUniqueFilename } from '../../_lib/storage';
import { DocumentTypeSchema, validateFile, MAX_FILE_SIZE } from '../../_lib/validation';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Deal ID is required' });
  }

  try {
    // Verify deal exists
    const deal = await prisma.deal.findUnique({ where: { id } });
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    if (req.method === 'GET') {
      return await listDocuments(id, res);
    } else if (req.method === 'POST') {
      return await uploadDocument(id, req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}

async function listDocuments(dealId: string, res: VercelResponse) {
  const documents = await prisma.document.findMany({
    where: { dealId },
    orderBy: { uploadedAt: 'desc' },
    include: {
      _count: {
        select: { chunks: true },
      },
    },
  });

  return res.status(200).json(documents);
}

async function uploadDocument(dealId: string, req: VercelRequest, res: VercelResponse) {
  // Parse multipart form data manually
  const contentType = req.headers['content-type'] || '';
  
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
  }

  // Read raw body
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  // Parse boundary
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  if (!boundaryMatch) {
    return res.status(400).json({ error: 'Invalid multipart boundary' });
  }
  const boundary = boundaryMatch[1] || boundaryMatch[2];

  // Parse parts
  const parts = parseMultipart(buffer, boundary);
  
  const docTypeField = parts.find(p => p.name === 'docType');
  const fileField = parts.find(p => p.name === 'file');

  if (!docTypeField || !fileField) {
    return res.status(400).json({ error: 'docType and file are required' });
  }

  // Validate docType
  const docTypeResult = DocumentTypeSchema.safeParse(docTypeField.value);
  if (!docTypeResult.success) {
    return res.status(400).json({ error: 'Invalid document type' });
  }
  const docType = docTypeResult.data;

  // Validate file
  if (!fileField.filename || !fileField.data) {
    return res.status(400).json({ error: 'File is required' });
  }

  const mimeType = fileField.contentType || 'application/pdf';
  const fileSize = fileField.data.length;

  try {
    validateFile({ mimetype: mimeType, size: fileSize });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid file' });
  }

  if (fileSize > MAX_FILE_SIZE) {
    return res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` });
  }

  // Save file
  const storage = getStorage();
  const uniqueFilename = generateUniqueFilename(fileField.filename);
  const storagePath = await storage.save(uniqueFilename, fileField.data, mimeType);

  // Create document record
  const document = await prisma.document.create({
    data: {
      dealId,
      docType,
      fileName: uniqueFilename,
      originalName: fileField.filename,
      mimeType,
      fileSize,
      storagePath,
      parseStatus: 'PENDING',
    },
  });

  // Create activity
  await prisma.activity.create({
    data: {
      dealId,
      type: 'DOCUMENT_UPLOADED',
      message: `${docType.replace(/_/g, ' ')} uploaded: ${fileField.filename}`,
      metadata: {
        documentId: document.id,
        docType,
        fileName: fileField.filename,
        fileSize,
      },
    },
  });

  // Update deal status if needed
  await updateDealStatus(dealId);

  return res.status(201).json(document);
}

interface MultipartPart {
  name: string;
  value?: string;
  filename?: string;
  contentType?: string;
  data?: Buffer;
}

function parseMultipart(buffer: Buffer, boundary: string): MultipartPart[] {
  const parts: MultipartPart[] = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const crlfBuffer = Buffer.from('\r\n');
  const doubleCrlf = Buffer.from('\r\n\r\n');

  let start = buffer.indexOf(boundaryBuffer);
  
  while (start !== -1) {
    const boundaryEnd = start + boundaryBuffer.length;
    const nextBoundary = buffer.indexOf(boundaryBuffer, boundaryEnd);
    
    if (nextBoundary === -1) break;

    const partBuffer = buffer.slice(boundaryEnd, nextBoundary);
    
    // Skip leading CRLF
    let headerStart = 0;
    if (partBuffer[0] === 0x0d && partBuffer[1] === 0x0a) {
      headerStart = 2;
    }

    const headerEnd = partBuffer.indexOf(doubleCrlf, headerStart);
    if (headerEnd === -1) {
      start = nextBoundary;
      continue;
    }

    const headers = partBuffer.slice(headerStart, headerEnd).toString('utf-8');
    let dataStart = headerEnd + 4;
    let dataEnd = partBuffer.length;
    
    // Remove trailing CRLF
    if (partBuffer[dataEnd - 2] === 0x0d && partBuffer[dataEnd - 1] === 0x0a) {
      dataEnd -= 2;
    }

    const data = partBuffer.slice(dataStart, dataEnd);

    // Parse headers
    const contentDisposition = headers.match(/Content-Disposition: form-data;([^\r\n]+)/i);
    if (contentDisposition) {
      const nameMatch = contentDisposition[1].match(/name="([^"]+)"/);
      const filenameMatch = contentDisposition[1].match(/filename="([^"]+)"/);
      const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);

      if (nameMatch) {
        const part: MultipartPart = {
          name: nameMatch[1],
        };

        if (filenameMatch) {
          part.filename = filenameMatch[1];
          part.contentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
          part.data = data;
        } else {
          part.value = data.toString('utf-8');
        }

        parts.push(part);
      }
    }

    start = nextBoundary;
  }

  return parts;
}

async function updateDealStatus(dealId: string) {
  const documents = await prisma.document.findMany({
    where: { dealId },
    select: { docType: true },
  });

  const requiredTypes = [
    'BORROWER_INTAKE_SUMMARY',
    'PERSONAL_FINANCIAL_STATEMENT',
    'BUSINESS_FINANCIAL_STATEMENTS',
    'BUSINESS_TAX_RETURNS',
    'PERSONAL_TAX_RETURNS',
    'BUSINESS_DEBT_SCHEDULE',
    'BANK_STATEMENTS',
  ];

  const uploadedTypes = new Set(documents.map(d => d.docType));
  const hasAllRequired = requiredTypes.every(type => uploadedTypes.has(type));

  const newStatus = hasAllRequired ? 'READY' : 'DRAFT';

  await prisma.deal.update({
    where: { id: dealId },
    data: { status: newStatus },
  });
}

