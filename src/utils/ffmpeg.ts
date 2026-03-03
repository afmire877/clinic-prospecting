import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ConvertOptions, RESOLUTIONS } from '../types';

export function checkFFmpegInstallation(): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', ['-version'], (error, stdout) => {
      if (error) {
        reject(
          new Error(
            'FFmpeg is not installed or not in PATH.\n' +
              'Install it with:\n' +
              '  Ubuntu/Debian: sudo apt install ffmpeg\n' +
              '  macOS: brew install ffmpeg\n' +
              '  Windows: https://ffmpeg.org/download.html'
          )
        );
        return;
      }
      const firstLine = stdout.split('\n')[0];
      console.log(`  FFmpeg: ${firstLine}`);
      resolve();
    });
  });
}

function buildConcatFile(
  slideImages: string[],
  duration: number,
  tempDir: string
): string {
  const concatPath = path.join(tempDir, 'concat.txt');
  const lines = slideImages.map(
    (img) => `file '${img}'\nduration ${duration}`
  );
  // Repeat last image to avoid ffmpeg cutting it short
  lines.push(`file '${slideImages[slideImages.length - 1]}'`);
  fs.writeFileSync(concatPath, lines.join('\n'));
  return concatPath;
}

export function createVideoFromSlides(
  slideImages: string[],
  outputPath: string,
  options: ConvertOptions,
  tempDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const res = RESOLUTIONS[options.resolution];
    const concatFile = buildConcatFile(slideImages, options.duration, tempDir);

    const args = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFile,
    ];

    // Add audio if provided
    if (options.audio) {
      args.push('-i', options.audio);
    }

    // Video filters: scale to target resolution, pad to fit
    const vf = [
      `scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease`,
      `pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2:black`,
      'format=yuv420p',
    ];

    if (options.transition === 'fade') {
      // Add fade-in on first frame
      vf.push('fade=t=in:st=0:d=0.5');
    }

    args.push(
      '-vf', vf.join(','),
      '-r', String(options.fps),
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
    );

    if (options.audio) {
      args.push(
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
      );
    }

    args.push(outputPath);

    const totalDuration = slideImages.length * options.duration;
    console.log(`\n  Encoding video (${slideImages.length} slides, ~${totalDuration}s)...`);

    const proc = execFile(
      'ffmpeg',
      args,
      { timeout: 300000 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`FFmpeg encoding failed: ${error.message}\n${stderr}`));
          return;
        }
        resolve();
      }
    );

    // Show progress via stderr
    if (proc.stderr) {
      let lastPercent = -1;
      proc.stderr.on('data', (data: Buffer) => {
        const line = data.toString();
        const timeMatch = line.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseFloat(timeMatch[3]);
          const elapsed = hours * 3600 + minutes * 60 + seconds;
          const percent = Math.min(100, Math.round((elapsed / totalDuration) * 100));
          if (percent > lastPercent) {
            lastPercent = percent;
            process.stdout.write(`\r  Progress: ${percent}%`);
          }
        }
      });
    }
  });
}
