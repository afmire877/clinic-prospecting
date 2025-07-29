import ffmpeg from 'fluent-ffmpeg';
import { spawn } from 'child_process';
import { VideoInfo } from '../types';

export async function checkFFmpegInstallation(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpegProcess = spawn('ffmpeg', ['-version']);
    
    ffmpegProcess.on('error', () => {
      resolve(false);
    });
    
    ffmpegProcess.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

export async function getVideoInfo(inputPath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
      if (err) {
        reject(new Error(`Failed to get video info: ${err.message}`));
        return;
      }
      
      const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found in file'));
        return;
      }
      
      // Parse framerate safely
      let framerate = 0;
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
        if (den && den !== 0) {
          framerate = num / den;
        }
      }
      
      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        codec: videoStream.codec_name || 'unknown',
        framerate
      });
    });
  });
}

export async function extractClip(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number,
  quality: string = 'original',
  format: string = 'mp4',
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .seekInput(startTime)
      .duration(duration)
      .format(format);
    
    // Apply quality settings
    if (quality === 'original') {
      command = command.videoCodec('copy').audioCodec('copy');
    } else if (quality === '720p') {
      command = command.size('1280x720').videoBitrate('2000k');
    } else if (quality === '480p') {
      command = command.size('854x480').videoBitrate('1000k');
    }
    
    command
      .on('start', (commandLine: string) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress: any) => {
        if (onProgress && progress.percent) {
          onProgress(Math.round(progress.percent));
        }
      })
      .on('end', () => {
        resolve();
      })
      .on('error', (err: any) => {
        reject(new Error(`FFmpeg error: ${err.message}`));
      })
      .save(outputPath);
  });
}