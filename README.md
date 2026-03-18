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

## Important Notes

- **App Restriction profiles require a supervised device.** Personal iPhones are typically not supervised. The restriction payload will install but won't block apps unless the device is supervised (via Apple Configurator or DEP).
- **Reminder profiles work on all devices** and serve as a visible nudge in your Settings.
- **Profiles can always be removed** — `PayloadRemovalDisallowed` is set to `false` so you stay in control.
- The schedule in the profile is metadata/documentation only. iOS doesn't natively support time-based profile activation. For true scheduling, pair with **Shortcuts automations** to remind yourself to install/remove profiles at specific times.
