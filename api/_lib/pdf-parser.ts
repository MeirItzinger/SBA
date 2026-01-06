import { extractText } from 'unpdf';
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
  // Validate buffer
  if (!buffer || buffer.length === 0) {
    console.error('PDF parsing error: Empty buffer received');
    throw new Error('Empty or invalid PDF file');
  }

  // Check PDF magic bytes
  const header = buffer.slice(0, 5).toString();
  if (!header.startsWith('%PDF')) {
    console.error('PDF parsing error: Invalid PDF header:', header);
    throw new Error('File is not a valid PDF');
  }

  console.log('Parsing PDF with unpdf, buffer size:', buffer.length, 'bytes');

  try {
    // Use unpdf to extract text
    const { text, totalPages } = await extractText(buffer, { mergePages: true });
    
    const fullText = typeof text === 'string' ? text : (text as string[]).join('\n\n');
    const numPages = totalPages || 1;

    console.log('PDF parsed successfully:', numPages, 'pages,', fullText.length, 'chars');

    // Split text into chunks
    const chunks = splitIntoChunks(fullText, numPages, CHUNK_SIZE);

    return {
      text: fullText,
      numPages,
      chunks,
    };
  } catch (error) {
    // Log the actual error for debugging
    console.error('PDF parsing error:', error instanceof Error ? error.message : error);
    
    // Re-throw with more context
    throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
