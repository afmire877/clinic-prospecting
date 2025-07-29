export function parseTimestamp(timestamp: string): number {
  timestamp = timestamp.trim();
  
  // Handle seconds format (e.g., "923.5", "923.5s")
  if (/^\d+(\.\d+)?s?$/.test(timestamp)) {
    return parseFloat(timestamp.replace('s', ''));
  }
  
  // Handle time format (MM:SS or H:MM:SS)
  const parts = timestamp.split(':').map(part => parseInt(part, 10));
  
  if (parts.length === 2) {
    // MM:SS format
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // H:MM:SS format
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  throw new Error(`Invalid timestamp format: ${timestamp}. Use MM:SS, H:MM:SS, or seconds (e.g., 923.5)`);
}

export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

export function validateTimestamps(start: string, end: string, videoDuration: number): void {
  const startSeconds = parseTimestamp(start);
  const endSeconds = parseTimestamp(end);
  
  if (startSeconds < 0) {
    throw new Error('Start time cannot be negative');
  }
  
  if (endSeconds <= startSeconds) {
    throw new Error('End time must be greater than start time');
  }
  
  if (startSeconds >= videoDuration) {
    throw new Error(`Start time (${formatTimestamp(startSeconds)}) exceeds video duration (${formatTimestamp(videoDuration)})`);
  }
  
  if (endSeconds > videoDuration) {
    throw new Error(`End time (${formatTimestamp(endSeconds)}) exceeds video duration (${formatTimestamp(videoDuration)})`);
  }
}