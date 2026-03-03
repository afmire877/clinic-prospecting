import { execFile, execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getSlideImages } from './filesystem';
import { RESOLUTIONS } from '../types';

export function checkLibreOfficeInstallation(): Promise<void> {
  return new Promise((resolve) => {
    execFile('libreoffice', ['--version'], (error, stdout) => {
      if (error) {
        console.log('  LibreOffice: not found (will use Python renderer)');
        resolve();
        return;
      }
      const version = stdout.trim();
      console.log(`  LibreOffice: ${version}`);
      resolve();
    });
  });
}

function convertWithLibreOffice(
  inputPath: string,
  outputDir: string
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const absInput = path.resolve(inputPath);

    const args = [
      '--headless',
      '--norestore',
      '--convert-to',
      'png',
      '--outdir',
      outputDir,
      absInput,
    ];

    execFile(
      'libreoffice',
      args,
      { timeout: 120000 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`LibreOffice conversion failed: ${error.message}\n${stderr}`));
          return;
        }

        // Check for known failure message
        if (stderr && stderr.includes('source file could not be loaded')) {
          reject(new Error('LibreOffice could not load the source file.'));
          return;
        }

        const images = getSlideImages(outputDir);
        if (images.length > 0) {
          resolve(images);
          return;
        }

        reject(new Error('LibreOffice produced no output images.'));
      }
    );
  });
}

function convertWithPython(
  inputPath: string,
  outputDir: string,
  resolution: string
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const absInput = path.resolve(inputPath);
    const rendererScript = path.join(__dirname, '..', 'utils', 'slide-renderer.py');

    // Resolve the script path - check both src and dist locations
    let scriptPath = rendererScript;
    if (!fs.existsSync(scriptPath)) {
      // Try relative to compiled dist
      scriptPath = path.join(__dirname, '..', '..', 'src', 'utils', 'slide-renderer.py');
    }

    if (!fs.existsSync(scriptPath)) {
      reject(new Error(
        'Slide renderer script not found.\n' +
        'Ensure python-pptx and Pillow are installed:\n' +
        '  pip install python-pptx Pillow'
      ));
      return;
    }

    const res = RESOLUTIONS[resolution] || RESOLUTIONS['1080p'];
    const args = [scriptPath, absInput, outputDir, String(res.width), String(res.height)];

    console.log('  Using Python renderer (python-pptx + Pillow)...');

    execFile(
      'python3',
      args,
      { timeout: 120000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Python renderer failed: ${error.message}\n${stderr}`));
          return;
        }

        if (stdout) {
          console.log(`  ${stdout.trim()}`);
        }

        const images = getSlideImages(outputDir);
        if (images.length === 0) {
          reject(new Error('Python renderer produced no slide images.'));
          return;
        }

        resolve(images);
      }
    );
  });
}

export async function extractSlidesAsImages(
  inputPath: string,
  outputDir: string,
  resolution: string = '1080p'
): Promise<string[]> {
  console.log('\n  Converting slides to images...');

  // Try LibreOffice first (best quality)
  try {
    const images = await convertWithLibreOffice(inputPath, outputDir);
    if (images.length > 0) {
      console.log(`  Exported ${images.length} slide(s) via LibreOffice.`);
      return images;
    }
  } catch {
    // LibreOffice failed or unavailable - fall through
  }

  // Fallback: Python-based renderer
  try {
    const images = await convertWithPython(inputPath, outputDir, resolution);
    return images;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to convert slides to images.\n${msg}\n\n` +
      'Ensure one of these is available:\n' +
      '  1. LibreOffice: sudo apt install libreoffice\n' +
      '  2. Python + python-pptx + Pillow: pip install python-pptx Pillow'
    );
  }
}
