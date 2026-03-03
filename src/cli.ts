import { Command } from 'commander';
import { convertCommand } from './commands/convert';
import { ConvertOptions } from './types';

const program = new Command();

program
  .name('ppt2mp4')
  .description('Convert PowerPoint presentations to MP4 video')
  .version('1.0.0');

program
  .command('convert')
  .description('Convert a PPT/PPTX/ODP file to an MP4 video')
  .argument('<input-file>', 'Path to .ppt, .pptx, or .odp file')
  .option('-o, --output <file>', 'Output MP4 file path (default: same name as input)')
  .option('-d, --duration <seconds>', 'Duration per slide in seconds', '5')
  .option('-r, --resolution <res>', 'Output resolution: 1080p, 720p, 480p', '1080p')
  .option('-t, --transition <type>', 'Transition: none, fade', 'none')
  .option('--audio <file>', 'Background audio file to overlay')
  .option('--fps <number>', 'Frames per second', '30')
  .action(async (inputFile: string, opts: Record<string, string>) => {
    const options: ConvertOptions = {
      output: opts.output,
      duration: parseFloat(opts.duration),
      resolution: opts.resolution as ConvertOptions['resolution'],
      transition: opts.transition as ConvertOptions['transition'],
      audio: opts.audio,
      fps: parseInt(opts.fps, 10),
    };

    // Validate options
    if (isNaN(options.duration) || options.duration <= 0) {
      console.error('Error: --duration must be a positive number.');
      process.exit(1);
    }
    if (!['1080p', '720p', '480p'].includes(options.resolution)) {
      console.error('Error: --resolution must be 1080p, 720p, or 480p.');
      process.exit(1);
    }
    if (!['none', 'fade'].includes(options.transition)) {
      console.error('Error: --transition must be none or fade.');
      process.exit(1);
    }
    if (isNaN(options.fps) || options.fps <= 0) {
      console.error('Error: --fps must be a positive number.');
      process.exit(1);
    }

    try {
      await convertCommand(inputFile, options);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\n  Error: ${error.message}`);
      } else {
        console.error('\n  An unexpected error occurred.');
      }
      process.exit(1);
    }
  });

program
  .command('help')
  .description('Show detailed usage information')
  .action(() => {
    console.log(`
╔══════════════════════════════════════╗
║       PPT to MP4 Converter           ║
╚══════════════════════════════════════╝

  Convert PowerPoint presentations to MP4 video files.

  USAGE:
    ppt2mp4 convert <input-file> [options]

  EXAMPLES:
    ppt2mp4 convert slides.pptx
    ppt2mp4 convert deck.pptx -d 8 -r 720p
    ppt2mp4 convert talk.pptx -o output.mp4 --audio music.mp3
    ppt2mp4 convert slides.pptx -t fade --fps 24

  OPTIONS:
    -o, --output <file>       Output MP4 path (default: <input-name>.mp4)
    -d, --duration <seconds>  Seconds per slide (default: 5)
    -r, --resolution <res>    1080p | 720p | 480p (default: 1080p)
    -t, --transition <type>   none | fade (default: none)
    --audio <file>            Background audio track
    --fps <number>            Frames per second (default: 30)

  SUPPORTED INPUT FORMATS:
    .pptx   PowerPoint (modern)
    .ppt    PowerPoint (legacy)
    .odp    LibreOffice Impress

  REQUIREMENTS:
    - LibreOffice (for slide rendering)
    - FFmpeg (for video encoding)
`);
  });

program.parse(process.argv);
