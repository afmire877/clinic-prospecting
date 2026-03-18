import { Command } from 'commander';
import { generate, listPresets } from './commands/generate';

const program = new Command();

program
  .name('mdm-scheduler')
  .description('Generate iOS mobileconfig profiles to block apps on a schedule')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate a .mobileconfig profile to block apps')
  .option('-a, --app <bundleId...>', 'App bundle ID(s) to block', [])
  .option('-p, --preset <name...>', 'Use a preset group (social, video, games, news, messaging)', [])
  .option('-n, --name <name>', 'Profile display name', 'App Blocker')
  .option('-s, --schedule <schedule>', 'Block schedule, e.g. Mon-Fri@09:00-17:00')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('--serve', 'Start a local HTTP server for iPhone installation')
  .option('--port <port>', 'Server port', '8080')
  .option('--lockdown', 'Make profile hard to remove (adds removal password)')
  .action((opts) => {
    generate({
      apps: opts.app,
      presets: opts.preset,
      name: opts.name,
      output: opts.output,
      schedule: opts.schedule,
      serve: opts.serve,
      port: parseInt(opts.port, 10),
      lockdown: opts.lockdown,
    });
  });

program
  .command('list')
  .description('List available app presets')
  .action(() => {
    listPresets();
  });

program.parse(process.argv);
