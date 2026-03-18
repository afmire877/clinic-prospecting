import { v4 as uuidv4 } from 'uuid';
import { BlockProfile, GeneratedProfile, ScheduleEntry } from '../types';
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
 * Build a .mobileconfig XML profile that restricts apps.
 *
 * Uses the com.apple.applicationaccess payload with blacklistedAppBundleIDs.
 * NOTE: This requires the device to be supervised. For non-supervised devices
 * the profile will install but the restriction won't take effect.
 */
function buildAppRestrictionXml(profile: BlockProfile): string {
  const profileUUID = generatePayloadUUID();
  const payloadUUID = generatePayloadUUID();
  const org = profile.organization || 'Personal MDM Scheduler';

  const scheduleNote = profile.schedule
    ? `\nSchedule: ${formatScheduleDescription(profile.schedule)}`
    : '';

  const bundleIdEntries = profile.bundleIds
    .map((id) => `\t\t\t\t<string>${escapeXml(id)}</string>`)
    .join('\n');

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
\t\t</dict>
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
\t<false/>
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
 * Build a Screen Time-style notification reminder profile.
 * This works on non-supervised devices as a gentle nudge — it sets the
 * device description to remind you of your blocked schedule.
 *
 * Combined with Shortcuts automation, this can be effective for personal use.
 */
function buildReminderXml(profile: BlockProfile): string {
  const profileUUID = generatePayloadUUID();
  const org = profile.organization || 'Personal MDM Scheduler';

  const scheduleNote = profile.schedule
    ? formatScheduleDescription(profile.schedule)
    : 'Always active';

  const appNames = profile.bundleIds
    .map((id) => id.split('.').pop() || id)
    .join(', ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>PayloadContent</key>
\t<array/>
\t<key>PayloadDisplayName</key>
\t<string>${escapeXml(profile.displayName)} (Reminder)</string>
\t<key>PayloadDescription</key>
\t<string>Reminder: ${escapeXml(appNames)} blocked during ${escapeXml(scheduleNote)}</string>
\t<key>PayloadIdentifier</key>
\t<string>com.personal.mdm-scheduler.reminder.${profileUUID}</string>
\t<key>PayloadOrganization</key>
\t<string>${escapeXml(org)}</string>
\t<key>PayloadRemovalDisallowed</key>
\t<false/>
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

  // Always generate the app restriction profile (works on supervised devices)
  profiles.push({
    filename: `${safeName}-block.mobileconfig`,
    xml: buildAppRestrictionXml(profile),
    displayName: `${profile.displayName} (App Restriction)`,
  });

  // Also generate a reminder profile (works on all devices)
  profiles.push({
    filename: `${safeName}-reminder.mobileconfig`,
    xml: buildReminderXml(profile),
    displayName: `${profile.displayName} (Reminder)`,
  });

  return profiles;
}
