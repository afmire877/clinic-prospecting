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
    lockdown: options.lockdown,
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

  // If lockdown mode, write the removal password to a separate key file
  const lockdownInfo = profiles[0].lockdownInfo;
  if (lockdownInfo) {
    const keyFilename = `${profileName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-REMOVAL-KEY.txt`;
    const keyPath = path.join(outputDir, keyFilename);
    const keyContent = [
      '========================================',
      '  MDM PROFILE REMOVAL KEY',
      '========================================',
      '',
      `Profile:    ${lockdownInfo.profileName}`,
      `Generated:  ${lockdownInfo.generatedAt}`,
      '',
      'REMOVAL PASSWORD:',
      lockdownInfo.removalPassword,
      '',
      '========================================',
      'WARNING: You need this password to remove',
      'the profile from your iPhone. Store it',
      'somewhere inconvenient but recoverable.',
      '',
      'Ideas to make it hard to access:',
      '  - Give it to a friend',
      '  - Put it in a time-locked note app',
      '  - Email it to yourself with a future',
      '    send date',
      '  - Print it and seal in an envelope',
      '  - Store on a USB drive and hide it',
      '========================================',
    ].join('\n');

    fs.writeFileSync(keyPath, keyContent, 'utf-8');
    console.log(`Created: ${keyPath}`);
  }

  console.log(`\nBlocking ${bundleIds.length} app(s):`);
  for (const id of bundleIds) {
    console.log(`  - ${id}`);
  }

  if (schedule) {
    console.log(`\nSchedule: ${formatScheduleDescription(schedule)}`);
  }

  if (lockdownInfo) {
    console.log('\n*** LOCKDOWN MODE ENABLED ***');
    console.log('The profile requires a 43-character random password to remove.');
    console.log('The password has been saved to a separate key file.');
    console.log('Hide that key file somewhere hard to reach before installing.\n');
  }

  console.log('\nTo install on iPhone:');
  console.log('  1. AirDrop the .mobileconfig file to your iPhone, OR');
  console.log('  2. Re-run with --serve to start a local server\n');

  // Optionally start the server
  if (options.serve) {
    serveProfiles(profiles, options.port || 8080);
  }
}
