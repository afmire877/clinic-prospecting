import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function createTempDir(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppt2mp4-'));
  return tmpDir;
}

export function cleanupTempDir(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

export function getSlideImages(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];

  return fs
    .readdirSync(dirPath)
    .filter((f) => /\.(png|jpg|jpeg)$/i.test(f))
    .sort((a, b) => {
      // Sort numerically by extracting numbers from filenames
      const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    })
    .map((f) => path.join(dirPath, f));
}

export function generateOutputPath(
  inputPath: string,
  outputPath?: string
): string {
  if (outputPath) return path.resolve(outputPath);

  const parsed = path.parse(inputPath);
  return path.resolve(parsed.dir, `${parsed.name}.mp4`);
}

export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

export function isPptFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return ['.ppt', '.pptx', '.odp'].includes(ext);
}
