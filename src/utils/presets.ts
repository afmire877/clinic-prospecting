import { AppPreset } from '../types';

export const APP_PRESETS: Record<string, AppPreset> = {
  social: {
    name: 'Social Media',
    bundleIds: [
      'com.burbn.instagram',
      'com.atebits.Tweetie2', // X/Twitter
      'com.facebook.Facebook',
      'com.zhiliaoapp.musically', // TikTok
      'com.reddit.Reddit',
      'com.snapchat.snapchat',
      'net.whatsapp.WhatsApp',
    ],
  },
  video: {
    name: 'Video Streaming',
    bundleIds: [
      'com.google.ios.youtube',
      'com.netflix.Netflix',
      'com.disney.disneyplus',
      'com.hbo.hbonow', // HBO Max
      'com.amazon.aiv.AIVApp', // Prime Video
    ],
  },
  games: {
    name: 'Games',
    bundleIds: [
      'com.supercell.laser', // Brawl Stars
      'com.supercell.clash', // Clash of Clans
      'com.king.candycrushsaga',
      'com.innersloth.amongus',
    ],
  },
  news: {
    name: 'News',
    bundleIds: [
      'com.apple.news',
      'com.cnn.iphone',
      'com.nytimes.NYTimes',
      'com.google.GoogleNews',
    ],
  },
  messaging: {
    name: 'Messaging',
    bundleIds: [
      'com.facebook.Messenger',
      'org.telegram.TelegramEnterprise',
      'com.discord.Discord',
      'com.slack.Slack',
    ],
  },
};

export function resolveApps(
  apps: string[],
  presets: string[]
): string[] {
  const bundleIds = new Set<string>();

  for (const preset of presets) {
    const p = APP_PRESETS[preset.toLowerCase()];
    if (!p) {
      console.error(`Unknown preset: "${preset}". Use --list to see available presets.`);
      process.exit(1);
    }
    p.bundleIds.forEach((id) => bundleIds.add(id));
  }

  for (const app of apps) {
    bundleIds.add(app);
  }

  return Array.from(bundleIds);
}
