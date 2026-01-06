import fs from 'fs/promises';
import path from 'path';
import { put, del } from '@vercel/blob';

export interface StorageProvider {
  save(filename: string, buffer: Buffer, contentType: string): Promise<string>;
  delete(storagePath: string): Promise<void>;
  getUrl(storagePath: string): string;
}

// Local filesystem storage for development
class LocalStorage implements StorageProvider {
  private basePath: string;

  constructor() {
    this.basePath = process.env.LOCAL_STORAGE_PATH || './uploads';
  }

  async save(filename: string, buffer: Buffer, _contentType: string): Promise<string> {
    // Ensure directory exists
    await fs.mkdir(this.basePath, { recursive: true });
    
    const filePath = path.join(this.basePath, filename);
    await fs.writeFile(filePath, buffer);
    
    return filePath;
  }

  async delete(storagePath: string): Promise<void> {
    try {
      await fs.unlink(storagePath);
    } catch (error) {
      // Ignore if file doesn't exist
      console.warn('Failed to delete file:', storagePath, error);
    }
  }

  getUrl(storagePath: string): string {
    // In local dev, we'd need to serve this via an API endpoint
    return `/api/files/${encodeURIComponent(path.basename(storagePath))}`;
  }
}

// Vercel Blob storage for production
class VercelBlobStorage implements StorageProvider {
  async save(filename: string, buffer: Buffer, contentType: string): Promise<string> {
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
    });
    return blob.url;
  }

  async delete(storagePath: string): Promise<void> {
    try {
      await del(storagePath);
    } catch (error) {
      console.warn('Failed to delete blob:', storagePath, error);
    }
  }

  getUrl(storagePath: string): string {
    // Vercel Blob URLs are already absolute
    return storagePath;
  }
}

// Factory to get the appropriate storage provider
export function getStorage(): StorageProvider {
  const driver = process.env.STORAGE_DRIVER || 'local';
  
  if (driver === 'vercel-blob') {
    return new VercelBlobStorage();
  }
  
  return new LocalStorage();
}

// Utility to sanitize filenames
export function sanitizeFilename(filename: string): string {
  // Remove path separators and special characters
  return filename
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

// Generate unique filename with timestamp
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitized = sanitizeFilename(originalName);
  const ext = path.extname(sanitized);
  const base = path.basename(sanitized, ext);
  
  return `${base}_${timestamp}_${random}${ext}`;
}

