export interface ClipOptions {
  start: string;
  end: string;
  name: string;
  tags?: string;
  quality?: string;
  format?: string;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  codec: string;
  framerate: number;
}

export interface Config {
  clipsDirectory: string;
  defaultQuality: string;
  defaultFormat: string;
  ffmpegPath: string;
}