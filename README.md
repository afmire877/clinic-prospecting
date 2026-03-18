# MDM App Scheduler

A lightweight CLI tool to generate iOS `.mobileconfig` profiles that block apps on a schedule. Built for personal use.

## How It Works

The tool generates Apple Configuration Profiles (`.mobileconfig` files) containing app restriction payloads. You install these on your iPhone to block distracting apps during focus hours.

**Two profile types are generated:**

- **App Restriction** — Uses `com.apple.applicationaccess` with `blacklistedAppBundleIDs`. Requires a **supervised** device to take effect.
- **Reminder** — A lightweight profile that works on **all devices** as a visible reminder of your block schedule (shows in Settings > General > VPN & Device Management).

## Setup

```bash
npm install
npm run build
```

## Usage

### Generate a blocking profile

```bash
# Block social media on weekdays 9am–5pm
mdm-scheduler generate --preset social --schedule "Mon-Fri@09:00-17:00" --name "Focus Mode"

# Block specific apps
mdm-scheduler generate --app com.burbn.instagram --app com.google.ios.youtube

# Combine presets and individual apps
mdm-scheduler generate --preset social --preset video --app com.some.app --schedule "daily@22:00-06:00"

# Generate and serve over local network for iPhone installation
mdm-scheduler generate --preset social --serve --port 8080

# LOCKDOWN MODE: make the profile extremely hard to remove
mdm-scheduler generate --preset social --schedule "Mon-Fri@09:00-17:00" --name "Focus Mode" --lockdown
```

### List available presets

```bash
mdm-scheduler list
```

**Presets:** `social`, `video`, `games`, `news`, `messaging`

### Schedule format

```
<days>@<startTime>-<endTime>

Days:     Mon-Fri, weekdays, weekends, daily, Mon,Wed,Fri
Times:    HH:MM in 24h format

Examples: Mon-Fri@09:00-17:00
          weekdays@08:00-12:00
          daily@22:00-06:00
          Sat,Sun@00:00-12:00
```

### Installing on iPhone

1. **AirDrop** the `.mobileconfig` file to your iPhone, or
2. Run with `--serve` and open the URL in Safari on your iPhone (same Wi-Fi network)
3. Go to **Settings > General > VPN & Device Management** to install the profile

To remove the block, just delete the profile from the same settings page.

### Lockdown mode

Use `--lockdown` to make the profile extremely difficult to remove:

```bash
mdm-scheduler generate --preset social --lockdown
```

This does two things:
1. Sets `PayloadRemovalDisallowed` to `true`
2. Adds a `com.apple.profileRemovalPassword` payload with a random 43-character password

A separate `*-REMOVAL-KEY.txt` file is generated with the password. To make removal truly painful:
- **Give the key file to a friend** and tell them not to share it until a certain date
- **Put it on a USB drive** and store it somewhere inconvenient
- **Email it to yourself** with a delayed/scheduled send
- **Print it, seal it in an envelope**, and stash it away

Without the password, you cannot remove the profile from Settings.

## Important Notes

- **App Restriction profiles require a supervised device.** Personal iPhones are typically not supervised. The restriction payload will install but won't block apps unless the device is supervised (via Apple Configurator or DEP).
- **Reminder profiles work on all devices** and serve as a visible nudge in your Settings.
- **Lockdown profiles** require the removal password to uninstall. Without it, the profile is stuck on your device.
- The schedule in the profile is metadata/documentation only. iOS doesn't natively support time-based profile activation. For true scheduling, pair with **Shortcuts automations** to remind yourself to install/remove profiles at specific times.
