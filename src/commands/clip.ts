import * as path from 'path';
import { ClipOptions } from '../types';
import { parseTimestamp, validateTimestamps, formatTimestamp } from '../utils/timestamps';
import { checkFFmpegInstallation, getVideoInfo, extractClip } from '../utils/ffmpeg';
import { fileExists, ensureDirectoryExists, generateClipFilename, getDefaultClipsDirectory } from '../utils/filesystem';

export async function clipCommand(videoPath: string, options: ClipOptions): Promise<void> {
  try {
    console.log('🎬 BJJ Clipper - Extracting video clip...\n');
    
    // Check FFmpeg installation
    console.log('⚙️  Checking FFmpeg installation...');
    const ffmpegInstalled = await checkFFmpegInstallation();
    if (!ffmpegInstalled) {
      throw new Error('FFmpeg not found. Please install FFmpeg and ensure it\'s in your PATH.');
    }
    console.log('✅ FFmpeg found\n');
    
    // Validate input file
    console.log('📁 Validating input file...');
    const inputExists = await fileExists(videoPath);
    if (!inputExists) {
      throw new Error(`Input video file not found: ${videoPath}`);
    }
    console.log(`✅ Input file found: ${path.basename(videoPath)}\n`);
    
    // Get video information
    console.log('📊 Analyzing video...');
    const videoInfo = await getVideoInfo(videoPath);
    console.log(`✅ Video duration: ${formatTimestamp(videoInfo.duration)}`);
    console.log(`   Resolution: ${videoInfo.width}x${videoInfo.height}`);
    console.log(`   Codec: ${videoInfo.codec}\n`);
    
    // Parse and validate timestamps
    console.log('⏰ Validating timestamps...');
    validateTimestamps(options.start, options.end, videoInfo.duration);
    const startSeconds = parseTimestamp(options.start);
    const endSeconds = parseTimestamp(options.end);
    const duration = endSeconds - startSeconds;
    
    console.log(`✅ Start: ${formatTimestamp(startSeconds)}`);
    console.log(`   End: ${formatTimestamp(endSeconds)}`);
    console.log(`   Duration: ${formatTimestamp(duration)}\n`);
    
    // Setup output directory and filename
    const clipsDir = getDefaultClipsDirectory();
    await ensureDirectoryExists(clipsDir);
    
    const outputFilename = generateClipFilename(
      formatTimestamp(startSeconds),
      options.name,
      options.tags,
      options.format || 'mp4'
    );
    const outputPath = path.join(clipsDir, outputFilename);
    
    console.log(`📂 Output directory: ${clipsDir}`);
    console.log(`📄 Output filename: ${outputFilename}\n`);
    
    // Extract the clip
    console.log('🎞️  Extracting clip...');
    let lastProgress = 0;
    
    await extractClip(
      videoPath,
      outputPath,
      startSeconds,
      duration,
      options.quality || 'original',
      options.format || 'mp4',
      (progress) => {
        if (progress > lastProgress + 5) { // Update every 5%
          console.log(`   Progress: ${progress}%`);
          lastProgress = progress;
        }
      }
    );
    
    console.log('\n✅ Clip extracted successfully!');
    console.log(`📍 Saved to: ${outputPath}`);
    
    // Display clip summary
    console.log('\n📋 Clip Summary:');
    console.log(`   Name: ${options.name}`);
    console.log(`   Duration: ${formatTimestamp(duration)}`);
    console.log(`   Quality: ${options.quality || 'original'}`);
    console.log(`   Format: ${options.format || 'mp4'}`);
    if (options.tags) {
      console.log(`   Tags: ${options.tags}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}