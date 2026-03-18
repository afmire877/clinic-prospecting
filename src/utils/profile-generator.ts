import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { BlockProfile, GeneratedProfile, LockdownInfo } from '../types';
import { formatScheduleDescription } from './schedule';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generatePayloadUUID(): string {
  return uuidv4().toUpperCase();
}

/**
 * Generate a cryptographically random removal password.
 * Long enough to be painful to type manually.
 */
function generateRemovalPassword(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Build the removal password payload XML block.
 * This is a separate payload inside the profile that forces the user
 * to enter the password before the profile can be removed.
 */
function buildRemovalPasswordPayload(password: string): string {
  const payloadUUID = generatePayloadUUID();
  return `\t\t<dict>
\t\t\t<key>PayloadType</key>
\t\t\t<string>com.apple.profileRemovalPassword</string>
\t\t\t<key>PayloadVersion</key>
\t\t\t<integer>1</integer>
\t\t\t<key>PayloadIdentifier</key>
\t\t\t<string>com.personal.mdm-scheduler.removal-password.${payloadUUID}</string>
\t\t\t<key>PayloadUUID</key>
\t\t\t<string>${payloadUUID}</string>
\t\t\t<key>PayloadDisplayName</key>
\t\t\t<string>Removal Password</string>
\t\t\t<key>PayloadDescription</key>
\t\t\t<string>Requires a password to remove this profile</string>
\t\t\t<key>RemovalPassword</key>
\t\t\t<string>${escapeXml(password)}</string>
\t\t</dict>`;
}

/**
 * Build a .mobileconfig XML profile that restricts apps.
 *
 * Uses the com.apple.applicationaccess payload with blacklistedAppBundleIDs.
 * NOTE: App blacklisting requires the device to be supervised.
 *
 * When lockdown is enabled:
 * - PayloadRemovalDisallowed = true
 * - A com.apple.profileRemovalPassword payload is added with a random password
 * - The password is returned separately so you can stash it somewhere hard to reach
 */
function buildAppRestrictionXml(
  profile: BlockProfile,
  removalPassword?: string
): string {
  const profileUUID = generatePayloadUUID();
  const payloadUUID = generatePayloadUUID();
  const org = profile.organization || 'Personal MDM Scheduler';
  const locked = profile.lockdown === true;

  const scheduleNote = profile.schedule
    ? `\nSchedule: ${formatScheduleDescription(profile.schedule)}`
    : '';

  const bundleIdEntries = profile.bundleIds
    .map((id) => `\t\t\t\t<string>${escapeXml(id)}</string>`)
    .join('\n');

  const removalPasswordPayload =
    locked && removalPassword
      ? '\n' + buildRemovalPasswordPayload(removalPassword)
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>PayloadContent</key>
\t<array>
\t\t<dict>
\t\t\t<key>PayloadType</key>
\t\t\t<string>com.apple.applicationaccess</string>
\t\t\t<key>PayloadVersion</key>
\t\t\t<integer>1</integer>
\t\t\t<key>PayloadIdentifier</key>
\t\t\t<string>com.personal.mdm-scheduler.apprestriction.${payloadUUID}</string>
\t\t\t<key>PayloadUUID</key>
\t\t\t<string>${payloadUUID}</string>
\t\t\t<key>PayloadDisplayName</key>
\t\t\t<string>${escapeXml(profile.displayName)}</string>
\t\t\t<key>PayloadDescription</key>
\t\t\t<string>${escapeXml(profile.description)}${escapeXml(scheduleNote)}</string>
\t\t\t<key>PayloadOrganization</key>
\t\t\t<string>${escapeXml(org)}</string>
\t\t\t<key>blacklistedAppBundleIDs</key>
\t\t\t<array>
${bundleIdEntries}
\t\t\t</array>
\t\t</dict>${removalPasswordPayload}
\t</array>
\t<key>PayloadDisplayName</key>
\t<string>${escapeXml(profile.displayName)}</string>
\t<key>PayloadDescription</key>
\t<string>${escapeXml(profile.description)}${escapeXml(scheduleNote)}</string>
\t<key>PayloadIdentifier</key>
\t<string>com.personal.mdm-scheduler.${profileUUID}</string>
\t<key>PayloadOrganization</key>
\t<string>${escapeXml(org)}</string>
\t<key>PayloadRemovalDisallowed</key>
\t<${locked}/>
\t<key>PayloadType</key>
\t<string>Configuration</string>
\t<key>PayloadUUID</key>
\t<string>${profileUUID}</string>
\t<key>PayloadVersion</key>
\t<integer>1</integer>
</dict>
</plist>`;
}

/**
 * Build a reminder profile (works on all devices).
 * When lockdown is enabled, this also gets the removal password treatment.
 */
function buildReminderXml(
  profile: BlockProfile,
  removalPassword?: string
): string {
  const profileUUID = generatePayloadUUID();
  const org = profile.organization || 'Personal MDM Scheduler';
  const locked = profile.lockdown === true;

  const scheduleNote = profile.schedule
    ? formatScheduleDescription(profile.schedule)
    : 'Always active';

  const appNames = profile.bundleIds
    .map((id) => id.split('.').pop() || id)
    .join(', ');

  const removalPasswordPayload =
    locked && removalPassword
      ? '\n' + buildRemovalPasswordPayload(removalPassword)
      : '';

  const payloadArrayContent =
    removalPasswordPayload || '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>PayloadContent</key>
\t<array>${payloadArrayContent}
\t</array>
\t<key>PayloadDisplayName</key>
\t<string>${escapeXml(profile.displayName)} (Reminder)</string>
\t<key>PayloadDescription</key>
\t<string>Reminder: ${escapeXml(appNames)} blocked during ${escapeXml(scheduleNote)}</string>
\t<key>PayloadIdentifier</key>
\t<string>com.personal.mdm-scheduler.reminder.${profileUUID}</string>
\t<key>PayloadOrganization</key>
\t<string>${escapeXml(org)}</string>
\t<key>PayloadRemovalDisallowed</key>
\t<${locked}/>
\t<key>PayloadType</key>
\t<string>Configuration</string>
\t<key>PayloadUUID</key>
\t<string>${profileUUID}</string>
\t<key>PayloadVersion</key>
\t<integer>1</integer>
</dict>
</plist>`;
}

export function generateProfiles(profile: BlockProfile): GeneratedProfile[] {
  const safeName = profile.displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const profiles: GeneratedProfile[] = [];

  // Generate one shared removal password for lockdown mode
  const removalPassword = profile.lockdown
    ? generateRemovalPassword()
    : undefined;

  const lockdownInfo: LockdownInfo | undefined =
    profile.lockdown && removalPassword
      ? {
          removalPassword,
          profileName: profile.displayName,
          generatedAt: new Date().toISOString(),
        }
      : undefined;

  // App restriction profile (works on supervised devices)
  profiles.push({
    filename: `${safeName}-block.mobileconfig`,
    xml: buildAppRestrictionXml(profile, removalPassword),
    displayName: `${profile.displayName} (App Restriction)`,
    lockdownInfo,
  });

  // Reminder profile (works on all devices)
  profiles.push({
    filename: `${safeName}-reminder.mobileconfig`,
    xml: buildReminderXml(profile, removalPassword),
    displayName: `${profile.displayName} (Reminder)`,
    lockdownInfo,
  });

  return profiles;
}
