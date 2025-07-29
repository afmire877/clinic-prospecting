import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error}`);
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export function generateClipFilename(
  startTime: string,
  name: string,
  tags?: string,
  extension: string = 'mp4'
): string {
  const sanitizedName = sanitizeFilename(name);
  const timePrefix = startTime.replace(':', '-');
  
  if (tags) {
    const sanitizedTags = tags.split(',').map(tag => sanitizeFilename(tag.trim()));
    return `${timePrefix}_${sanitizedName}_[${sanitizedTags.join(',')}].${extension}`;
  }
  
  return `${timePrefix}_${sanitizedName}.${extension}`;
}

export function getDefaultClipsDirectory(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(homeDir, 'bjj-clips');
}