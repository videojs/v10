import { parse } from '@bomb.sh/args';
import { handleConfig } from './commands/config.js';
import { handleDocs } from './commands/docs.js';

const parsed = parse(process.argv.slice(2), {
  alias: { f: 'framework', l: 'list', v: 'version', h: 'help' },
  string: ['framework', 'preset', 'skin', 'media', 'source-url', 'install-method'],
  boolean: ['list', 'version', 'help'],
});

const [command, ...rest] = parsed._ as string[];

declare const __CLI_VERSION__: string;

if (parsed.version) {
  console.log(`@videojs/cli v${__CLI_VERSION__}`);
  process.exit(0);
}

if (parsed.help || !command) {
  console.log(`@videojs/cli — Video.js documentation CLI

Usage:
  @videojs/cli docs <slug> [--framework <html|react>]
  @videojs/cli docs --list [--framework <html|react>]
  @videojs/cli docs how-to/installation [flags]
  @videojs/cli config <set|get|list> [key] [value]

Installation flags:
  --framework <html|react>                  JS framework
  --preset <video|audio|background-video>   Player preset (default: video)
  --skin <default|minimal>                  Skin (default: default)
  --media <html5-video|html5-audio|hls|background-video>  Media type
  --source-url <url>                        Media source URL
  --install-method <cdn|npm|pnpm|yarn|bun>  Install method (default: npm)

Options:
  -v, --version  Show version
  -h, --help     Show help
  -l, --list     List available docs
  -f, --framework  Set framework`);
  process.exit(0);
}

if (command === 'docs') {
  await handleDocs(parsed, rest);
} else if (command === 'config') {
  handleConfig(rest);
} else {
  console.error(`Unknown command: "${command}". Run with --help for usage.`);
  process.exit(1);
}
