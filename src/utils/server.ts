import * as http from 'http';
import * as os from 'os';
import { GeneratedProfile } from '../types';

/**
 * Serve generated profiles over HTTP for easy installation on iPhone.
 *
 * Open the URL on your iPhone's Safari to install the profile.
 * Note: iOS requires HTTPS for OTA profile installation in some cases,
 * but direct Safari downloads over HTTP on the local network generally work.
 */
export function serveProfiles(profiles: GeneratedProfile[], port: number): void {
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      const links = profiles
        .map(
          (p, i) =>
            `<li style="margin:12px 0"><a href="/profile/${i}" style="font-size:18px">${p.displayName}</a><br><small>${p.filename}</small></li>`
        )
        .join('\n');
      res.end(`<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MDM App Scheduler</title>
<style>body{font-family:-apple-system,sans-serif;max-width:600px;margin:40px auto;padding:0 20px}
h1{font-size:22px}ul{list-style:none;padding:0}a{color:#007AFF}</style>
</head><body>
<h1>MDM App Scheduler Profiles</h1>
<p>Tap a profile link on your iPhone to install it.</p>
<ul>${links}</ul>
<p style="color:#888;font-size:13px">Profiles with "App Restriction" require a supervised device.<br>
"Reminder" profiles work on all devices.</p>
</body></html>`);
      return;
    }

    const match = req.url?.match(/^\/profile\/(\d+)$/);
    if (match) {
      const index = parseInt(match[1], 10);
      if (index >= 0 && index < profiles.length) {
        const profile = profiles[index];
        res.writeHead(200, {
          'Content-Type': 'application/x-apple-aspen-config',
          'Content-Disposition': `attachment; filename="${profile.filename}"`,
        });
        res.end(profile.xml);
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  server.listen(port, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log('\nProfile server running!');
    console.log(`  Local:   http://localhost:${port}`);
    if (localIp) {
      console.log(`  Network: http://${localIp}:${port}`);
    }
    console.log('\nOpen the Network URL on your iPhone\'s Safari to install profiles.');
    console.log('Press Ctrl+C to stop.\n');
  });
}

function getLocalIp(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}
