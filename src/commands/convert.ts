import * as path from 'path';
import { ConvertOptions, RESOLUTIONS } from '../types';
import { checkLibreOfficeInstallation, extractSlidesAsImages } from '../utils/libreoffice';
import { checkFFmpegInstallation, createVideoFromSlides } from '../utils/ffmpeg';
import {
  fileExists,
  isPptFile,
  generateOutputPath,
  createTempDir,
  cleanupTempDir,
} from '../utils/filesystem';

export async function convertCommand(
  inputFile: string,
  options: ConvertOptions
): Promise<void> {
  const startTime = Date.now();

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║       PPT to MP4 Converter           ║');
  console.log('╚══════════════════════════════════════╝');

  // Validate input file
  const inputPath = path.resolve(inputFile);

  if (!fileExists(inputPath)) {
    console.error(`\n  Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  if (!isPptFile(inputPath)) {
    console.error('\n  Error: Input must be a .ppt, .pptx, or .odp file.');
    process.exit(1);
  }

  // Validate audio file if provided
  if (options.audio && !fileExists(path.resolve(options.audio))) {
    console.error(`\n  Error: Audio file not found: ${options.audio}`);
    process.exit(1);
  }

  const outputPath = generateOutputPath(inputPath, options.output);
  const res = RESOLUTIONS[options.resolution];

  console.log('\n  Configuration:');
  console.log(`  ├─ Input:       ${path.basename(inputPath)}`);
  console.log(`  ├─ Output:      ${path.basename(outputPath)}`);
  console.log(`  ├─ Resolution:  ${res.label}`);
  console.log(`  ├─ Slide duration: ${options.duration}s`);
  console.log(`  ├─ FPS:         ${options.fps}`);
  console.log(`  ├─ Transition:  ${options.transition}`);
  if (options.audio) {
    console.log(`  └─ Audio:       ${path.basename(options.audio)}`);
  } else {
    console.log('  └─ Audio:       none');
  }

  // Check dependencies
  console.log('\n  Checking dependencies...');
  await checkLibreOfficeInstallation();
  await checkFFmpegInstallation();

  // Create temp directory for slide images
  const tempDir = createTempDir();

  try {
    // Step 1: Convert PPT to slide images
    const slideImages = await extractSlidesAsImages(inputPath, tempDir, options.resolution);

    if (slideImages.length === 0) {
      console.error('\n  Error: No slides found in presentation.');
      process.exit(1);
    }

    // Step 2: Create video from slide images
    await createVideoFromSlides(slideImages, outputPath, options, tempDir);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalDuration = slideImages.length * options.duration;

    console.log('\n\n  ✓ Conversion complete!');
    console.log(`  ├─ Slides:    ${slideImages.length}`);
    console.log(`  ├─ Duration:  ${totalDuration}s`);
    console.log(`  ├─ Output:    ${outputPath}`);
    console.log(`  └─ Time:      ${elapsed}s`);
  } finally {
    // Clean up temp directory
    cleanupTempDir(tempDir);
  }
}
