#!/usr/bin/env node

import { Command } from 'commander';
import { clipCommand } from './commands/clip';
import { ClipOptions } from './types';

const program = new Command();

program
  .name('bjj')
  .description('CLI tool for Brazilian Jiu-Jitsu video clipping and organization')
  .version('1.0.0');

program
  .command('clip')
  .description('Extract a clip from a video file')
  .argument('<video-file>', 'Path to the input video file')
  .requiredOption('-s, --start <time>', 'Start time (e.g., 15:23, 1:15:23, or 923.5)')
  .requiredOption('-e, --end <time>', 'End time (e.g., 17:45, 1:17:45, or 1065.5)')
  .requiredOption('-n, --name <name>', 'Name for the clip (e.g., "kimura-from-guard")')
  .option('-t, --tags <tags>', 'Comma-separated tags (e.g., "guard,submission")')
  .option('-q, --quality <quality>', 'Output quality: original, 720p, 480p', 'original')
  .option('-f, --format <format>', 'Output format: mp4, webm', 'mp4')
  .action(async (videoFile: string, options: ClipOptions) => {
    await clipCommand(videoFile, options);
  });

program
  .command('help')
  .description('Show detailed help information')
  .action(() => {
    console.log(`
🥋 BJJ Clipper - Video Clipping Tool for Brazilian Jiu-Jitsu

OVERVIEW:
  Extract and organize video clips from BJJ instructional videos.
  All clips are saved to ~/bjj-clips/ with descriptive filenames.

BASIC USAGE:
  bjj clip <video-file> --start <time> --end <time> --name <name>

EXAMPLES:
  # Extract a 2-minute technique clip
  bjj clip instructional.mp4 --start 15:23 --end 17:23 --name "kimura-from-guard"
  
  # Add tags for better organization
  bjj clip video.mp4 -s 5:30 -e 8:15 -n "guard-retention" -t "guard,defense"
  
  # Specify quality and format
  bjj clip large-video.mp4 -s 1:30:45 -e 1:35:20 -n "back-take" -q 720p -f webm

TIMESTAMP FORMATS:
  • MM:SS (e.g., 15:23)
  • H:MM:SS (e.g., 1:15:23)  
  • Seconds (e.g., 923.5 or 923.5s)

QUALITY OPTIONS:
  • original - Copy streams (fastest, largest file)
  • 720p - Re-encode to 720p (good balance)
  • 480p - Re-encode to 480p (smallest file)

OUTPUT:
  Clips are saved to ~/bjj-clips/ with this naming pattern:
  HH-MM-SS_technique-name_[tag1,tag2].mp4

REQUIREMENTS:
  • FFmpeg must be installed and available in PATH
  • Input video file must exist and be readable

For more information, visit: https://github.com/your-repo/bjj-clipper
`);
  });

// Show help if no command provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv);