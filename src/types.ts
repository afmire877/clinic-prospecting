export interface AppPreset {
  name: string;
  bundleIds: string[];
}

export interface ScheduleEntry {
  days: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  startTime: string; // HH:MM (24h)
  endTime: string; // HH:MM (24h)
}

export interface BlockProfile {
  displayName: string;
  description: string;
  bundleIds: string[];
  schedule?: ScheduleEntry;
  organization?: string;
}

export interface ProfileOptions {
  apps: string[];
  presets: string[];
  name?: string;
  output?: string;
  schedule?: string; // e.g. "Mon-Fri@09:00-17:00"
  serve?: boolean;
  port?: number;
  list?: boolean;
}

export interface GeneratedProfile {
  filename: string;
  xml: string;
  displayName: string;
}
