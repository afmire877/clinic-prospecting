import * as fs from 'fs';
import * as path from 'path';
import { ProfileOptions, BlockProfile } from '../types';
import { resolveApps, APP_PRESETS } from '../utils/presets';
import { parseSchedule, formatScheduleDescription } from '../utils/schedule';
import { generateProfiles } from '../utils/profile-generator';
import { serveProfiles } from '../utils/server';

export function listPresets(): void {
  console.log('\nAvailable app presets:\n');
  for (const [key, preset] of Object.entries(APP_PRESETS)) {
    console.log(`  ${key.padEnd(12)} ${preset.name}`);
    for (const id of preset.bundleIds) {
      console.log(`               - ${id}`);
    }
    console.log();
  }
}

export function generate(options: ProfileOptions): void {
  if (options.list) {
    listPresets();
    return;
  }

  if (options.apps.length === 0 && options.presets.length === 0) {
    console.error('Error: Specify at least one app (--app) or preset (--preset).');
    console.error('Use --list to see available presets.');
    process.exit(1);
  }

  const bundleIds = resolveApps(options.apps, options.presets);
  const schedule = options.schedule ? parseSchedule(options.schedule) : undefined;

  const profileName = options.name || 'App Blocker';
  const description = schedule
    ? `Blocks apps: ${formatScheduleDescription(schedule)}`
    : 'Blocks selected apps';

  const blockProfile: BlockProfile = {
    displayName: profileName,
    description,
    bundleIds,
    schedule,
  };

  const profiles = generateProfiles(blockProfile);

  // Write files to disk
  const outputDir = options.output || process.cwd();
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const profile of profiles) {
    const filePath = path.join(outputDir, profile.filename);
    fs.writeFileSync(filePath, profile.xml, 'utf-8');
    console.log(`Created: ${filePath}`);
  }

  console.log(`\nBlocking ${bundleIds.length} app(s):`);
  for (const id of bundleIds) {
    console.log(`  - ${id}`);
  }

  if (schedule) {
    console.log(`\nSchedule: ${formatScheduleDescription(schedule)}`);
  }

  console.log('\nTo install on iPhone:');
  console.log('  1. AirDrop the .mobileconfig file to your iPhone, OR');
  console.log('  2. Re-run with --serve to start a local server\n');

  // Optionally start the server
  if (options.serve) {
    serveProfiles(profiles, options.port || 8080);
  }
}
