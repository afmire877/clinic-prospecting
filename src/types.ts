export interface ConvertOptions {
  output?: string;
  duration: number;
  resolution: '1080p' | '720p' | '480p';
  transition: 'none' | 'fade';
  audio?: string;
  fps: number;
}

export interface SlideInfo {
  index: number;
  imagePath: string;
  width: number;
  height: number;
}

export interface ConversionResult {
  outputPath: string;
  slideCount: number;
  totalDuration: number;
  resolution: string;
}

export interface ResolutionConfig {
  width: number;
  height: number;
  label: string;
}

export const RESOLUTIONS: Record<string, ResolutionConfig> = {
  '1080p': { width: 1920, height: 1080, label: '1920x1080' },
  '720p': { width: 1280, height: 720, label: '1280x720' },
  '480p': { width: 854, height: 480, label: '854x480' },
};
