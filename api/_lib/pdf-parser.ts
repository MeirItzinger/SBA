import pdfParse from 'pdf-parse';
import fs from 'fs/promises';

export interface ParsedPDF {
  text: string;
  numPages: number;
  chunks: Array<{
    chunkIndex: number;
    text: string;
    pageHint?: number;
  }>;
}

const CHUNK_SIZE = 4000; // Characters per chunk, keeping under token limits

export async function parsePDFFromPath(filePath: string): Promise<ParsedPDF> {
  const buffer = await fs.readFile(filePath);
  return parsePDFFromBuffer(buffer);
}

export async function parsePDFFromBuffer(buffer: Buffer): Promise<ParsedPDF> {  
  try {
    const data = await pdfParse(buffer, {
      // Options for pdf-parse
      max: 0, // Parse all pages
    });

    const fullText = data.text || '';
    const numPages = data.numpages || 1;

    // Split text into chunks
    const chunks = splitIntoChunks(fullText, numPages, CHUNK_SIZE);

    return {
      text: fullText,
      numPages,
      chunks,
    };
  } catch (error) {
    // Handle corrupted or problematic PDFs gracefully
    console.error('PDF parsing error:', error);
    
    // Return a placeholder result so the document can still be used
    return {
      text: '[PDF could not be parsed - file may be corrupted, scanned, or password-protected]',
      numPages: 1,
      chunks: [{
        chunkIndex: 0,
        text: '[PDF could not be parsed - file may be corrupted, scanned, or password-protected. Please try re-uploading or use a different file.]',
        pageHint: 1,
      }],
    };
  }
}

function splitIntoChunks(
  text: string,
  numPages: number,
  chunkSize: number
): Array<{ chunkIndex: number; text: string; pageHint?: number }> {
  const chunks: Array<{ chunkIndex: number; text: string; pageHint?: number }> = [];
  
  // Clean up text - normalize whitespace
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleanText) {
    return [{
      chunkIndex: 0,
      text: '[No text content extracted]',
      pageHint: 1,
    }];
  }

  // Split into paragraphs first
  const paragraphs = cleanText.split(/\n\n+/);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;

    // If adding this paragraph exceeds chunk size, save current and start new
    if (currentChunk.length + trimmedParagraph.length + 2 > chunkSize && currentChunk) {
      chunks.push({
        chunkIndex,
        text: currentChunk.trim(),
        // Estimate page number based on position in document
        pageHint: Math.min(
          Math.ceil((chunkIndex + 1) * (numPages / Math.max(chunks.length + 1, 1))),
          numPages
        ),
      });
      chunkIndex++;
      currentChunk = '';
    }

    currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
  }

  // Don't forget the last chunk
  if (currentChunk) {
    chunks.push({
      chunkIndex,
      text: currentChunk.trim(),
      pageHint: numPages,
    });
  }

  // If we ended up with no chunks, create one with the full text
  if (chunks.length === 0) {
    chunks.push({
      chunkIndex: 0,
      text: cleanText.substring(0, chunkSize),
      pageHint: 1,
    });
  }

  return chunks;
}

// Helper to truncate text for summaries
export function truncateText(text: string, maxLength: number = 1000): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

